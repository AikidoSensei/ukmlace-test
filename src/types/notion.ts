/**
 * Flexible types for Notion API responses.
 * Kept minimal because block types and structures vary.
 */

export interface NotionPage {
  id: string;
  title: string;
}

export interface NotionBlock {
  object: string;
  id: string;
  type: string;
  created_time?: string;
  last_edited_time?: string;
  has_children?: boolean;
  [key: string]: unknown;
}

export interface NotionBlockResponse {
  object: string;
  results: NotionBlock[];
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
  block?: unknown;
  [key: string]: unknown;
}
