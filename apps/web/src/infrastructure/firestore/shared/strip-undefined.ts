export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, current]) => current !== undefined)
      .map(([key, current]) => [key, stripUndefinedDeep(current)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}
