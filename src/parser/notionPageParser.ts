import type { NotionBlock } from "../types/notion";
import type { ContentNode, ParsedPage, ParsedSection } from "../types/parsedPage";

const HEADING_TYPES = ["heading_1", "heading_2", "heading_3"] as const;
const HEADING_LEVEL: Record<string, 1 | 2 | 3> = {
  heading_1: 1,
  heading_2: 2,
  heading_3: 3,
};

type BlockType = string;

function getBlockPayload(block: NotionBlock): Record<string, unknown> | null {
  const type = block.type as BlockType;
  const payload = block[type];
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
}

/**
 * Extract plain text from a block's rich_text (e.g. heading_2.rich_text, paragraph.rich_text).
 */
export function getRichTextPlain(block: NotionBlock): string {
  const payload = getBlockPayload(block);
  if (!payload) return "";
  const richText = payload.rich_text;
  if (!Array.isArray(richText)) return "";
  return richText
    .map((rt: { plain_text?: string; text?: { content?: string } }) => rt?.plain_text ?? rt?.text?.content ?? "")
    .join("");
}

function blockToContentNode(block: NotionBlock): ContentNode | ParsedSection | null {
  const type = block.type as BlockType;
  const id = block.id as string;
  const text = getRichTextPlain(block);

  if (HEADING_TYPES.includes(type as (typeof HEADING_TYPES)[number])) {
    const level = HEADING_LEVEL[type] ?? 2;
    return {
      id,
      title: text,
      level,
      children: [],
    };
  }

  switch (type) {
    case "paragraph":
      return { type: "paragraph", text, id };
    case "bulleted_list_item":
      return { type: "bulleted_list", items: [text], id };
    case "numbered_list_item":
      return { type: "numbered_list", items: [text], id };
    case "to_do": {
      const payload = getBlockPayload(block);
      const checked = !!payload?.checked;
      return { type: "todo", checked, text, id };
    }
    case "quote":
      return { type: "quote", text, id };
    case "code": {
      const payload = getBlockPayload(block);
      const language = typeof payload?.language === "string" ? payload.language : undefined;
      return { type: "code", text, language, id };
    }
    case "divider":
      return { type: "divider", id };
    default:
      return { type: "raw", blockType: type, text, id };
  }
}

/** Merge consecutive bulleted_list / numbered_list nodes into single nodes with items array */
function mergeListNodes(nodes: (ContentNode | ParsedSection)[]): (ContentNode | ParsedSection)[] {
  const out: (ContentNode | ParsedSection)[] = [];
  let bulletBuf: string[] = [];
  let numberedBuf: string[] = [];

  function flushBullet() {
    if (bulletBuf.length) {
      out.push({ type: "bulleted_list", items: [...bulletBuf] });
      bulletBuf = [];
    }
  }
  function flushNumbered() {
    if (numberedBuf.length) {
      out.push({ type: "numbered_list", items: [...numberedBuf] });
      numberedBuf = [];
    }
  }

  for (const n of nodes) {
    if ("title" in n && "level" in n) {
      flushBullet();
      flushNumbered();
      out.push(n);
      continue;
    }
    if (n.type === "bulleted_list") {
      bulletBuf.push(...n.items);
      continue;
    }
    if (n.type === "numbered_list") {
      flushBullet();
      numberedBuf.push(...n.items);
      continue;
    }
    flushBullet();
    flushNumbered();
    out.push(n);
  }
  flushBullet();
  flushNumbered();
  return out;
}

/**
 * Convert flat Notion blocks (e.g. from GET /v1/blocks/{page_id}/children) into
 * a nested structure: sections by heading_1/2/3 with content under each section.
 * Suitable for consumption in ukmlace plan 2 learning hub.
 *
 * Note: Only top-level blocks are used. If a block has_children (e.g. toggle),
 * fetch its children via GET /v1/blocks/{block_id}/children and pass a flattened
 * list if you need nested content in one run.
 */
export function notionBlocksToStructuredJson(blocks: NotionBlock[]): ParsedPage {
  const results = Array.isArray(blocks) ? blocks : [];
  const blockIds: string[] = [];
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentSubsection: ParsedSection | null = null;
  const stack: ParsedSection[] = []; // [section, subsection?] for nesting by level

  function pushContent(node: ContentNode | ParsedSection) {
    if ("title" in node && "level" in node) {
      const section = node as ParsedSection;
      if (section.level === 1 || section.level === 2) {
        currentSubsection = null;
        currentSection = section;
        sections.push(section);
        stack.length = 0;
        stack.push(section);
      } else {
        // level 3: subsection under current section
        if (currentSection) {
          currentSection.children.push(section);
          currentSubsection = section;
          while (stack.length > 0 && stack[stack.length - 1].level >= section.level) stack.pop();
          stack.push(section);
        }
      }
      return;
    }
    const contentNode = node as ContentNode;
    if (currentSubsection) {
      currentSubsection.children.push(contentNode);
    } else if (currentSection) {
      currentSection.children.push(contentNode);
    } else {
      // content before any heading -> attach to a synthetic section or first section
      if (sections.length === 0) {
        const synthetic: ParsedSection = {
          id: "top",
          title: "",
          level: 2,
          children: [contentNode],
        };
        sections.push(synthetic);
        currentSection = synthetic;
      } else {
        sections[0].children.push(contentNode);
      }
    }
  }

  const nodes: (ContentNode | ParsedSection)[] = [];
  for (const block of results) {
    if (block.type === "child_page" || block.type === "child_database") continue;
    const node = blockToContentNode(block);
    if (node) {
      blockIds.push((block as NotionBlock).id as string);
      nodes.push(node);
    }
  }

  const merged = mergeListNodes(nodes);

  for (const node of merged) {
    pushContent(node);
  }

  return { sections, blockIds };
}

/**
 * Parse the raw Notion API response (object with results array) into ParsedPage.
 */
export function parseNotionBlockResponse(response: unknown): ParsedPage {
  const obj = response && typeof response === "object" ? response as Record<string, unknown> : {};
  const results = Array.isArray(obj.results) ? (obj.results as NotionBlock[]) : [];
  return notionBlocksToStructuredJson(results);
}
