/** URL de base pour les appels API (sans slash final). */
export function getApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (env !== undefined && env !== "") {
    return env.replace(/\/$/, "");
  }
  // Navigateur : même origine → proxy Next.js (évite CORS + certificat auto-signé).
  if (typeof window !== "undefined") return "";
  // SSR / scripts : cible directe du back.
  const raw = (process.env.API_PROXY_TARGET ?? "https://localhost:44302").replace(
    /\/$/,
    "",
  );
  // IPv4 forcé seulement en HTTP ; HTTPS local (IIS) doit rester sur localhost.
  if (raw.startsWith("http://localhost")) {
    return raw.replace("://localhost", "://127.0.0.1");
  }
  return raw;
}
