import { getCollection } from 'astro:content';

// SHOW_DRAFTS=1 builds a private preview that includes drafts.
export const showDrafts = import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === '1';

export async function getPosts() {
  const posts = await getCollection('blog', ({ data }) => showDrafts || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', '.');
}
