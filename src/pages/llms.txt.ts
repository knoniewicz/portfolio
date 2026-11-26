import type { APIRoute } from 'astro';
import { listed } from '../lib/projects';
import { getPosts } from '../lib/posts';
import { age, yearsWorking, yearsFullTime } from '../lib/profile';

// Plain-text profile for AI assistants (llms.txt convention), built from the same data as the site.
export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') ?? '';
  const link = (href: string) => (href.startsWith('http') ? href : base + href);
  const projects = listed
    .map((p) => `- [${p.name}](${link(p.url || `/projects/${p.slug}/`)}): ${p.summary} (${p.state})`)
    .join('\n');
  const posts = (await getPosts())
    .map((p) => `- [${p.data.title}](${base}/blog/${p.id}/): ${p.data.description}`)
    .join('\n');

  const body = `# Kacper Noniewicz

> Software developer at Schauer Agrotronic (Austria), ${age} years old. Builds AI systems that work with real machines: self-hosted LLMs, retrieval over technical documentation, live device data over MCP, and the infrastructure underneath. ${yearsWorking}+ years of professional experience (since 06/2022, part-time alongside school), ${yearsFullTime}+ of them full-time (since 07/2024).

## Highlights

- Main developer of SIGI, Schauer Agrotronic's AI service assistant, which won Gold at the Innovationspreis Agrarfuchs 2026 (AGRARIA Wels, category work efficiency and workplace quality). Self-hosted open-weights model, RAG over the machine manuals including their images, an MCP server for the SDU-X controllers, and an MCP aggregator that gives the agent one endpoint for every device. Mentored an intern on the project.
- Led the migration of the company's touch interfaces from legacy Angular to the current stack.
- Retired Go projects (Nov 2026, replaced by Bober): Kor (TCP message router), Korpus (acknowledged-write store on SQLite), Kron (sandboxed Lua automation host).
- 2nd place, Accenture Hackathon Vienna 2022.

## Projects

${projects}

${posts ? `## Writing\n\n${posts}\n\n` : ''}## Background

- Education: HTBLA Grieskirchen, Informatik (2019-2024, EQF level 5)
- Languages: Polish, German, English
- Skills: Go, TypeScript, Angular, Node.js, Python, SQLite, LLMs, RAG, MCP, embedded and touch-first UIs

## Contact

- Email: kacper@noniewicz.eu
- GitHub: https://github.com/knoniewicz
- LinkedIn: https://www.linkedin.com/in/noniewicz
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
