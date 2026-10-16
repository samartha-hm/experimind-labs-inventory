// Compare saved content only; timestamps and revision identities are not edits.
// Stable identities keep reordering distinct from changing a material's owner.
export interface ContentChange { path: string; before: string; after: string }
export function compareKitContent(before: unknown, after: unknown): ContentChange[] {
  function flatten(value: unknown, path: string, output: Map<string, string>) {
    if (Array.isArray(value)) {
      output.set(`${path} / order`, value.map((entry, index) => entry && typeof entry === 'object' && 'id' in entry ? String(entry.id) : String(index + 1)).join(', '));
      value.forEach((entry, index) => {
        const identity = entry && typeof entry === 'object' && 'id' in entry ? String(entry.id) : String(index + 1);
        flatten(entry, `${path} / ${identity}`, output);
      });
    } else if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) flatten(entry, path ? `${path} / ${key.replaceAll('_', ' ')}` : key, output);
    } else output.set(path, value == null ? '—' : String(value));
  }
  const left = new Map<string, string>(); const right = new Map<string, string>();
  flatten(before, '', left); flatten(after, '', right);
  return [...new Set([...left.keys(), ...right.keys()])].filter(path => left.get(path) !== right.get(path))
    .map(path => ({ path, before: left.get(path) ?? 'Not present', after: right.get(path) ?? 'Not present' }));
}
