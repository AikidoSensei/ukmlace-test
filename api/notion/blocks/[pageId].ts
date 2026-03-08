import { Client } from "@notionhq/client";

type NotionBlock = { id: string; has_children?: boolean; [key: string]: unknown };

async function fetchAllChildren(
  notion: Client,
  blockId: string
): Promise<NotionBlock[]> {
  const results: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      ...(cursor && { start_cursor: cursor }),
    });
    const list = (res as { results?: unknown[] }).results ?? [];
    results.push(...(list as NotionBlock[]));
    const hasMore = (res as { has_more?: boolean }).has_more;
    cursor = (res as { next_cursor?: string }).next_cursor;
    if (!hasMore || !cursor) break;
  } while (true);
  return results;
}

async function fetchFullPage(
  notion: Client,
  pageId: string
): Promise<NotionBlock[]> {
  const top = await fetchAllChildren(notion, pageId);
  const flattened: NotionBlock[] = [];
  for (const block of top) {
    flattened.push(block);
    if (block.has_children) {
      const children = await fetchFullPage(notion, block.id);
      flattened.push(...children);
    }
  }
  return flattened;
}

export const config = { runtime: "nodejs" };

export async function GET(request: Request) {
  const token = process.env.NOTION_TOKEN ?? process.env.VITE_NOTION_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing NOTION_TOKEN in environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const pathname = new URL(request.url).pathname;
  const pageId = pathname.replace(/^\/api\/notion\/blocks\//, "").trim();
  if (!pageId) {
    return new Response(JSON.stringify({ error: "Missing pageId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const notion = new Client({ auth: token });
    const results = await fetchFullPage(notion, pageId);
    const response = {
      object: "list",
      results,
      next_cursor: null,
      has_more: false,
      type: "block",
      block: {},
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Notion API error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
