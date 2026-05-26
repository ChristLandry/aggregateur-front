import http from "node:http";
import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

const TARGET = (process.env.API_PROXY_TARGET ?? "https://localhost:44302").replace(
  /\/$/,
  "",
);

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

function nodeRequest(
  target: URL,
  method: string,
  headers: Record<string, string>,
  body?: Buffer,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const isHttps = target.protocol === "https:";
  const mod = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method,
        headers,
        rejectUnauthorized: false,
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
      },
    );
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

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  const upstream = await nodeRequest(target, req.method, headers, body);

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
}
