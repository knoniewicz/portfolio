import all from '../data/projects.json';
import { showDrafts } from './posts';

// Projects marked draft (not published yet) only show up in dev and SHOW_DRAFTS=1 previews.
export const projects = all.filter((p) => showDrafts || !('draft' in p && p.draft));
