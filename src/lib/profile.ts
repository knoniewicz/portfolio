// Dates the home page and llms.txt derive ages and years from, so nothing goes stale.
export const born = new Date('2004-05-24');
export const startedWork = new Date('2022-06-01'); // part-time at Schauer Agrotronic
export const startedFullTime = new Date('2024-07-01');

export function yearsSince(date: Date, now = new Date()) {
  const before = now < new Date(now.getFullYear(), date.getMonth(), date.getDate());
  return now.getFullYear() - date.getFullYear() - (before ? 1 : 0);
}

export const age = yearsSince(born);
export const yearsWorking = yearsSince(startedWork);
export const yearsFullTime = yearsSince(startedFullTime);

// Shared by the home sidebar and the CV, so both say the same thing.
export const skills = [
  ['languages', 'Go, TypeScript, Python, Lua'],
  ['web & UI', 'Angular, Node.js, touch-first UIs'],
  ['systems', 'SQLite, Nix, embedded and serial devices'],
  ['AI', 'LLMs, RAG, MCP'],
] as const;
