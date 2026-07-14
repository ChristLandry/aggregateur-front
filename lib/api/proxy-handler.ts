import http from "node:http";
import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

/**
 * Sur Windows, `localhost` en HTTP déclenche souvent un dual-stack Node
 * (IPv4+IPv6) → AggregateError / ECONNREFUSED intermittent.
 * En HTTPS (IIS Express), garder `localhost` : `127.0.0.1` casse le Host/cert.
 */
function resolveProxyTarget(): string {
  const raw = (process.env.API_PROXY_TARGET ?? "https://localhost:44302").replace(
    /\/$/,
    "",
  );
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" && url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

const TARGET = resolveProxyTarget();
const PROXY_TIMEOUT_MS = 120_000;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const IDEMPOTENT = new Set(["GET", "HEAD", "OPTIONS"]);

function nodeRequest(
  target: URL,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const isHttps = target.protocol === "https:";
  const mod = isHttps ? https : http;
  const port = target.port || (isHttps ? 443 : 80);

  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port,
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          ...headers,
          // IIS Express attend souvent Host=localhost:port (pas 127.0.0.1).
          host: `${target.hostname}:${port}`,
        },
        // IPv4 forcé seulement en HTTP ; HTTPS local gère mieux le dual-stack.
        ...(isHttps ? {} : { family: 4 as const }),
        rejectUnauthorized: false,
        timeout: PROXY_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 502,
            headers: res.headers,
            body: Buffer.concat(chunks),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => {
      req.destroy(
        Object.assign(new Error(`Proxy timeout after ${PROXY_TIMEOUT_MS}ms`), {
          code: "ETIMEDOUT",
        }),
      );
    });
    req.on("error", reject);
    if (body?.length) req.write(body);
    req.end();
  });
}

export async function proxyToBackend(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.join("/");
  const incoming = new URL(req.url);
  const target = new URL(`${TARGET}/${path}${incoming.search}`);

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers[key] = value;
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  try {
    let upstream;
    try {
      upstream = await nodeRequest(target, method, headers, body);
    } catch (first) {
      const code =
        first && typeof first === "object" && "code" in first
          ? String((first as { code?: unknown }).code)
          : undefined;
      // Ne jamais rejouer un POST/PUT/PATCH (ex. onboard déjà persisté côté API).
      const canRetry =
        IDEMPOTENT.has(method) &&
        (code === "ECONNREFUSED" || code === "ECONNRESET");
      if (canRetry) {
        await new Promise((r) => setTimeout(r, 150));
        upstream = await nodeRequest(target, method, headers, body);
      } else {
        throw first;
      }
    }

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (value === undefined || HOP_BY_HOP.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
      else responseHeaders.set(key, value);
    }

    return new NextResponse(new Uint8Array(upstream.body), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : undefined;
    const message =
      code === "ECONNREFUSED" || code === "ECONNRESET"
        ? `Backend inaccessible sur ${TARGET}. Vérifiez que l'API tourne (Kestrel/IIS) et que API_PROXY_TARGET est correct.`
        : code === "ETIMEDOUT"
          ? `Délai dépassé en attendant ${TARGET}. L'opération a peut‑être réussi côté API.`
          : err instanceof Error
            ? err.message
            : "Erreur proxy vers le backend";

    return NextResponse.json(
      {
        success: false,
        errorCode:
          code === "ETIMEDOUT" ? "TIMEOUT" : "BACKEND_UNAVAILABLE",
        errorMessage: message,
        title: "Bad Gateway",
        detail: message,
        status: 502,
        code,
      },
      { status: 502 },
    );
  }
}
