const mongoOperatorPattern = /^\$/;
const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);

export function sanitizePlainText(input: string) {
  return input.replace(/[<>]/g, "").trim();
}

export function sanitizeObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item)) as T;
  }

  if (input && typeof input === "object") {
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (mongoOperatorPattern.test(key) || dangerousKeys.has(key)) {
        continue;
      }

      next[key] = sanitizeObject(value);
    }

    return next as T;
  }

  if (typeof input === "string") {
    return sanitizePlainText(input) as T;
  }

  return input;
}
