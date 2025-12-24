import { validateNonEmpty, validateTags } from "./validators.js";

test("validateNonEmpty", () => {
  expect(validateNonEmpty("")).toEqual({ ok: false, message: "Required" });
  expect(validateNonEmpty("  hi ")).toEqual({ ok: true, value: "hi" });
});

test("validateTags clamps and trims", () => {
  const r = validateTags([" a ", "", "b", "c"]);
  expect(r.ok).toBe(true);
  expect(r.value).toEqual(["a", "b", "c"]);
});
