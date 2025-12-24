export function validateNonEmpty(value) {
  const v = (value ?? "").trim();
  if (!v) return { ok: false, message: "Required" };
  return { ok: true, value: v };
}

export function validateTags(tags) {
  if (!Array.isArray(tags)) return { ok: false, message: "Tags must be an array" };
  const cleaned = tags
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 10);
  return { ok: true, value: cleaned };
}
