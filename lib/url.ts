export const resolveAppBaseUrl = (
  envUrl: string | undefined,
  fallback: string,
) => {
  if (!envUrl) return fallback;
  try {
    const parsed = new URL(envUrl);
    parsed.hash = "";
    parsed.search = "";
    const normalizedPath = parsed.pathname.replace(/\/$/, "");
    return normalizedPath ? `${parsed.origin}${normalizedPath}` : parsed.origin;
  } catch {
    console.warn(`Invalid APP_URL provided: ${envUrl}`);
    return fallback;
  }
};
