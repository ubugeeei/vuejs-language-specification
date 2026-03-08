export function getByJsonPointer(value: unknown, pointer: string): unknown {
  if (pointer === "") {
    return value;
  }

  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = value;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      current = current[index];
      continue;
    }

    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
      continue;
    }

    return undefined;
  }

  return current;
}
