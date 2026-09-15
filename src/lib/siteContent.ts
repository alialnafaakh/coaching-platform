/** Shared site_content merge helpers — DB values win over defaults. */

export type SiteLang = "en" | "ar";

export function deepMergeLangContent(
  defaults: Record<string, unknown>,
  saved: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!saved || typeof saved !== "object") return { ...defaults };

  const out: Record<string, unknown> = { ...defaults };

  for (const key of Object.keys(saved)) {
    const sv = saved[key];
    const dv = defaults[key];

    // Always replace arrays wholesale (never merge by index).
    if (Array.isArray(sv)) {
      out[key] = sv;
      continue;
    }

    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      dv &&
      typeof dv === "object" &&
      !Array.isArray(dv)
    ) {
      out[key] = deepMergeLangContent(
        dv as Record<string, unknown>,
        sv as Record<string, unknown>
      );
      continue;
    }

    // Primitive / other: any defined saved value wins (including "")
    if (sv !== undefined) out[key] = sv;
  }

  return out;
}

export function mergeSiteContent(
  defaults: { en: Record<string, unknown>; ar: Record<string, unknown> },
  saved: unknown
): { en: Record<string, unknown>; ar: Record<string, unknown> } {
  const raw =
    saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};

  return {
    en: deepMergeLangContent(defaults.en, raw.en as Record<string, unknown> | undefined),
    ar: deepMergeLangContent(defaults.ar, raw.ar as Record<string, unknown> | undefined),
  };
}
