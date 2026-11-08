/**
 * Public canonical marketing origin only. Do not build sitemap entries for
 * tenant form slugs, private dashboards, login or future internal agent pages.
 */
export const DEFAULT_SITE_ORIGIN = "https://leadflow-ai-flame.vercel.app";

export function getSiteOrigin(
  candidate: string | undefined = process.env.NEXT_PUBLIC_SITE_URL
): string {
  if (!candidate) return DEFAULT_SITE_ORIGIN;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) return DEFAULT_SITE_ORIGIN;

    return url.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}
