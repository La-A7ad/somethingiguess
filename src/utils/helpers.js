export function nowIso() {
  return new Date().toISOString();
}

export function arrayMove(arr, from, to) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function stableJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
