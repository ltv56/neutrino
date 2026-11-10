export interface PageSplit {
  title: string;
  page: number | null;
}

// Accepts "Title#5" and "Title#page=5"; anything else stays part of the title.
const PAGE_SUFFIX = /^(.+)#(?:page=)?(\d+)$/;

export function splitPageSuffix(text: string): PageSplit {
  const m = PAGE_SUFFIX.exec(text);
  if (!m) return { title: text, page: null };
  return { title: m[1], page: parseInt(m[2], 10) };
}
