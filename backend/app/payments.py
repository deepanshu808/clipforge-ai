import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/payments", tags=["payments"])

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"

FALLBACK_PLANS: Dict[str, Dict[str, Any]] = {
    "pro": {"id": "pro", "name": "Pro", "price_inr": 299, "duration_days": 30},
    "premium": {"id": "premium", "name": "Premium", "price_inr": 799, "duration_days": 30},
}


def _get_env() -> Dict[str, str]:
    return {
        "rzp_key_id": (os.getenv("RAZORPAY_KEY_ID") or "").strip(),
        "rzp_key_secret": (os.getenv("RAZORPAY_KEY_SECRET") or "").strip(),
        "supabase_url": (
            os.getenv("SUPABASE_URL")
            or os.getenv("VITE_SUPABASE_URL")
            or "https://tbdjvlvwkmyafvwktmbk.supabase.co"
        ).strip().rstrip("/"),
        "supabase_service_key": (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip(),
        "supabase_anon_key": (
            os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or ""
        ).strip(),
    }


def _supabase_rest_headers(service_key: str) -> Dict[str, str]:
    headers = {
        "apikey": service_key,
        "Content-Type": "application/json",
    }
    if service_key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {service_key}"
    return headers


async def _get_authenticated_user(request: Request, env: Dict[str, str]) -> Dict[str, Any]:
    auth_header = (request.headers.get("authorization") or "").strip()
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Payment ke liye pehle Login karein.")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid login session.")

    api_key = env["supabase_anon_key"] or env["supabase_service_key"]
    if not env["supabase_url"] or not api_key:
        raise HTTPException(status_code=500, detail="Supabase backend variables configured nahi hain.")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{env['supabase_url']}/auth/v1/user",
                headers={
                    "apikey": api_key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase auth check failed: {exc}")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Session expire ho gaya hai. Dobara login karein.")

    user = resp.json()
    if not user.get("id") or not user.get("email"):
        raise HTTPException(status_code=401, detail="User account verify nahi ho paya.")
    return user


async def _lookup_plan(plan_id: str, env: Dict[str, str]) -> Dict[str, Any]:
    normalized = (plan_id or "").strip().lower()
    if normalized not in ("pro", "premium"):
        raise HTTPException(status_code=400, detail="Sirf Pro ya Premium plan hi purchase kar sakte hain.")

    key = env["supabase_service_key"] or env["supabase_anon_key"]
    if env["supabase_url"] and key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{env['supabase_url']}/rest/v1/plan_config",
                    params={"id": f"eq.{normalized}", "select": "*"},
                    headers=_supabase_rest_headers(key),
                )
            if resp.status_code == 200:
                rows = resp.json()
                if isinstance(rows, list) and rows:
                    row = rows[0]
                    price_inr = int(round(float(row.get("price_inr") or 0)))
                    duration_days = max(1, int(row.get("duration_days") or 30))
                    if price_inr > 0:
                        return {
                            "id": normalized,
                            "name": str(row.get("name") or normalized.title()),
                            "price_inr": price_inr,
                            "duration_days": duration_days,
                        }
        except Exception as exc:
            print(f"[ClipForge AI] plan_config lookup fallback: {exc}", flush=True)

    return FALLBACK_PLANS[normalized]


async def _activate_user_plan(
    user_id: str,
    email: str,
    plan_id: str,
    duration_days: int,
    env: Dict[str, str],
) -> Dict[str, Any]:
    service_key = env["supabase_service_key"]
    if not env["supabase_url"] or not service_key:
        raise HTTPException(
            status_code=500,
            detail="Railway me SUPABASE_SERVICE_ROLE_KEY aur SUPABASE_URL set karein.",
        )

    headers = _supabase_rest_headers(service_key)
    headers["Prefer"] = "return=representation"

    now_dt = datetime.now(timezone.utc)
    base_dt = now_dt

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            existing_resp = await client.get(
                f"{env['supabase_url']}/rest/v1/user_plans",
                params={"user_id": f"eq.{user_id}", "select": "*"},
                headers=headers,
            )
            existing_rows = existing_resp.json() if existing_resp.status_code == 200 else []
            if isinstance(existing_rows, list) and existing_rows:
                raw_until = existing_rows[0].get("valid_until")
                if raw_until:
                    try:
                        prev_dt = datetime.fromisoformat(str(raw_until).replace("Z", "+00:00"))
                        if prev_dt.tzinfo is None:
                            prev_dt = prev_dt.replace(tzinfo=timezone.utc)
                        if prev_dt > now_dt:
                            base_dt = prev_dt
                    except ValueError:
                        pass

            new_valid_until = (base_dt + timedelta(days=duration_days)).isoformat()
            payload = {
                "user_id": user_id,
                "email": email,
                "plan_id": plan_id,
                "status": "active",
                "valid_until": new_valid_until,
                "updated_at": now_dt.isoformat(),
            }

            if isinstance(existing_rows, list) and existing_rows:
                save_resp = await client.patch(
                    f"{env['supabase_url']}/rest/v1/user_plans",
                    params={"user_id": f"eq.{user_id}"},
                    json=payload,
                    headers=headers,
                )
            else:
                save_resp = await client.post(
                    f"{env['supabase_url']}/rest/v1/user_plans",
                    json=payload,
                    headers=headers,
                )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase plan update failed: {exc}")

    if save_resp.status_code not in (200, 201, 204):
        raise HTTPException(
            status_code=502,
            detail=f"Plan save error (HTTP {save_resp.status_code}): {save_resp.text}",
        )

    return {
        "plan_id": plan_id,
        "status": "active",
        "valid_until": new_valid_until,
        "duration_days": duration_days,
    }


class CreateOrderRequest(BaseModel):
    plan_id: str


class VerifyPaymentRequest(BaseModel):
    plan_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/create-order")
async def create_order(req: CreateOrderRequest, request: Request):
    env = _get_env()
    user = await _get_authenticated_user(request, env)

    if not env["rzp_key_id"] or not env["rzp_key_secret"]:
        raise HTTPException(
            status_code=500,
            detail="Railway me RAZORPAY_KEY_ID aur RAZORPAY_KEY_SECRET set nahi hain.",
        )

    plan = await _lookup_plan(req.plan_id, env)
    amount_paise = int(plan["price_inr"]) * 100

    order_payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"cf_{str(user['id'])[:8]}_{uuid.uuid4().hex[:8]}",
        "notes": {
            "user_id": str(user["id"]),
            "email": str(user["email"]),
            "plan_id": plan["id"],
            "duration_days": str(plan["duration_days"]),
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{RAZORPAY_API_BASE}/orders",
                auth=(env["rzp_key_id"], env["rzp_key_secret"]),
                json=order_payload,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Razorpay connection error: {exc}")

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Razorpay order create nahi hua (HTTP {resp.status_code}): {resp.text}",
        )

    order = resp.json()
    return {
        "key_id": env["rzp_key_id"],
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order.get("currency", "INR"),
        "plan_id": plan["id"],
        "duration_days": plan["duration_days"],
    }


@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest, request: Request):
    env = _get_env()
    user = await _get_authenticated_user(request, env)

    if not env["rzp_key_id"] or not env["rzp_key_secret"]:
        raise HTTPException(status_code=500, detail="Razorpay secret key configured nahi hai.")

    order_id = req.razorpay_order_id.strip()
    payment_id = req.razorpay_payment_id.strip()
    signature = req.razorpay_signature.strip()

    if not order_id or not payment_id or not signature:
        raise HTTPException(status_code=400, detail="Payment verification fields missing hain.")

    expected_signature = hmac.new(
        env["rzp_key_secret"].encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature.")

    # Razorpay order se real plan_id aur user_id confirm karein (tampering protection)
    verified_plan_id = req.plan_id.strip().lower()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            order_resp = await client.get(
                f"{RAZORPAY_API_BASE}/orders/{order_id}",
                auth=(env["rzp_key_id"], env["rzp_key_secret"]),
            )
        if order_resp.status_code == 200:
            notes = order_resp.json().get("notes") or {}
            if notes.get("user_id") and str(notes["user_id"]) != str(user["id"]):
                raise HTTPException(status_code=403, detail="Yeh payment order is account ka nahi hai.")
            if notes.get("plan_id"):
                verified_plan_id = str(notes["plan_id"]).strip().lower()
    except HTTPException:
        raise
    except Exception:
        pass

    plan = await _lookup_plan(verified_plan_id, env)
    activated = await _activate_user_plan(
        user_id=str(user["id"]),
        email=str(user["email"]),
        plan_id=plan["id"],
        duration_days=int(plan["duration_days"]),
        env=env,
    )

    return {
        "verified": True,
        "order_id": order_id,
        "payment_id": payment_id,
        **activated,
    }
