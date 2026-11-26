import all from '../data/projects.json';
import { showDrafts } from './posts';

// Projects marked draft (not published yet) only show up in dev and SHOW_DRAFTS=1 previews.
export const projects = all.filter((p) => showDrafts || !('draft' in p && p.draft));

// Home-page cards; `listed: false` entries (e.g. the Kor stack card) stay off the full list.
export const featured = projects.filter((p) => p.featured).slice(0, 4);
export const listed = projects.filter((p) => !('listed' in p) || p.listed !== false);

export function projectHref(p: { slug: string; url?: string | null; href?: string }) {
  return p.url || ('href' in p && p.href) || `/projects/${p.slug}/`;
}
