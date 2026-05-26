/** URL de base pour les appels API (sans slash final). */
export function getApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (env !== undefined && env !== "") {
    return env.replace(/\/$/, "");
  }
  // Navigateur : même origine → proxy Next.js (évite CORS + certificat auto-signé).
  if (typeof window !== "undefined") return "";
  // SSR / scripts : cible directe du back.
  return (process.env.API_PROXY_TARGET ?? "https://localhost:44302").replace(/\/$/, "");
}
