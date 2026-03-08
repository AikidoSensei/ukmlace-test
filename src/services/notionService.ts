import type { NotionPage } from "../types/notion";

const API_BASE = "";

/**
 * Fetches database pages from the Notion API (via dev server proxy).
 * Returns the same list shape used by the app: { id, title }[].
 */
export async function getDatabasePages(): Promise<NotionPage[]> {
  const res = await fetch(`${API_BASE}/api/notion/pages`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

/**
 * Fetches block children for a page (GET /v1/blocks/{page_id}/children).
 * Returns the raw JSON response from the Notion API — no transformation.
 */
export async function getPageBlocks(pageId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/notion/blocks/${encodeURIComponent(pageId)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}
