const SUPABASE_ORIGIN = "https://tbdjvlvwkmyafvwktmbk.supabase.co";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "apikey,authorization,content-type,x-client-info,prefer,range,accept,accept-profile,content-profile,x-supabase-api-version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const incomingUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);

    let subPath = "";
    if (req.query && req.query.path) {
      subPath = Array.isArray(req.query.path)
        ? req.query.path.join("/")
        : String(req.query.path);
    } else {
      subPath = incomingUrl.pathname
        .replace(/^\/api\/supabase/, "")
        .replace(/^\/supabase/, "");
    }
    subPath = "/" + subPath.replace(/^\/+/, "");

    incomingUrl.searchParams.delete("path");
    incomingUrl.searchParams.delete("...path");
    const query = incomingUrl.searchParams.toString();
    const targetUrl = `${SUPABASE_ORIGIN}${subPath}${query ? `?${query}` : ""}`;

    const forwardHeaders: Record<string, string> = {};
    const allowedHeaders = [
      "apikey",
      "authorization",
      "content-type",
      "accept",
      "accept-profile",
      "content-profile",
      "prefer",
      "range",
      "x-client-info",
      "x-supabase-api-version",
    ];

    for (const key of allowedHeaders) {
      const val = req.headers[key];
      if (val) {
        forwardHeaders[key] = Array.isArray(val) ? val.join(", ") : String(val);
      }
    }

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined && req.body !== null) {
      body =
        typeof req.body === "string" || Buffer.isBuffer(req.body)
          ? req.body
          : JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);

    const data = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(data);
  } catch (err: any) {
    return res.status(502).json({
      error: "Proxy connection failed",
      message: err?.message || "Unknown upstream error",
    });
  }
}
