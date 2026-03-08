/**
 * Structured output for Notion page content, suitable for consumption
 * in ukmlace plan 2 learning hub. Sections follow heading hierarchy (h1 → h2 → h3).
 */

export type ContentNode =
  | { type: "paragraph"; text: string; id?: string }
  | { type: "bulleted_list"; items: string[]; id?: string }
  | { type: "numbered_list"; items: string[]; id?: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string; id?: string }
  | { type: "todo"; checked: boolean; text: string; id?: string }
  | { type: "quote"; text: string; id?: string }
  | { type: "code"; text: string; language?: string; id?: string }
  | { type: "divider"; id?: string }
  | { type: "raw"; blockType: string; text: string; id?: string };

export interface ParsedSection {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  /** Subsections (heading_3 under this section) or flat content nodes */
  children: (ParsedSection | ContentNode)[];
}

export interface ParsedPage {
  /** Top-level sections (heading_1 or heading_2), with nested subsections and content */
  sections: ParsedSection[];
  /** Block IDs in order, for optional reference */
  blockIds: string[];
}
