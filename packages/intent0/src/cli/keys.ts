/**
 * Keys of a JS object literal body, e.g. `success: false, referenceId, message: form.msg`
 * → ["success", "referenceId", "message"]. Values (false, form.msg) are not keys.
 */
export function objectKeys(body: string): string[] {
  const keys = new Set<string>();
  // key: value  (at the start or after a comma)
  for (const m of body.matchAll(/(?:^|,)\s*["']?([A-Za-z_]\w*)["']?\s*:/g)) keys.add(m[1]!);
  // shorthand { referenceId, status }
  for (const m of body.matchAll(/(?:^|,)\s*([A-Za-z_]\w*)\s*(?=,|$)/g)) keys.add(m[1]!);
  for (const literal of ["true", "false", "null", "undefined"]) keys.delete(literal);
  return [...keys];
}
