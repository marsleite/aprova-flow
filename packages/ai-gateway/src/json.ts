export function extractFirstJsonObject(raw: string): string | null {
  const input = raw?.trim();
  if (!input) return null;

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function parseJsonFromModelText<T>(raw: string): T | null {
  if (!raw) return null;

  // Tentativa direta
  try {
    return JSON.parse(raw) as T;
  } catch {
    // segue
  }

  // Remove fences markdown
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // segue
  }

  const extracted = extractFirstJsonObject(cleaned);
  if (!extracted) return null;

  try {
    return JSON.parse(extracted) as T;
  } catch {
    return null;
  }
}
