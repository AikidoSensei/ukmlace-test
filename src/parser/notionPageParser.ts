import type { NotionBlock } from "../types/notion";
import type {
  ContentNode,
  KeyValuePage,
  KeyValueSectionValue,
  ParsedPage,
  ParsedSection,
} from "../types/parsedPage";

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

// --- Key-value output (section + field keys as snake_case) ---

/** "Who you are:" → "who_are_you", "Patient information" → "patient_information" */
function toSlugKey(text: string): string {
  return text
    .replace(/:+\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "") || "value";
}

function isLabelLike(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && (t.endsWith(":") || /^[A-Za-z][^:]*:\s*.+/.test(t));
}

/** Extract key and optional value from a line. "Label: value" or "Label:"; lines with no colon are not labels. */
function parseLabelValue(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx === -1) return null;
  const label = trimmed.slice(0, colonIdx).trim();
  const value = trimmed.slice(colonIdx + 1).trim();
  if (!label) return null;
  return { key: toSlugKey(label), value };
}

/** Flatten section + subsection content into ordered list of text lines */
function flattenSectionToLines(section: ParsedSection): string[] {
  const lines: string[] = [];
  for (const child of section.children) {
    if ("title" in child && "level" in child && "children" in child) {
      lines.push(...flattenSectionToLines(child as ParsedSection));
      continue;
    }
    const node = child as ContentNode;
    if (node.type === "paragraph") lines.push(node.text);
    else if (node.type === "bulleted_list") lines.push(...node.items);
    else if (node.type === "numbered_list") lines.push(...node.items);
    else if (node.type === "todo" || node.type === "quote" || node.type === "raw") lines.push(node.text);
    else if (node.type === "code") lines.push(node.text);
  }
  return lines;
}

/** Build value for a subsection (###): object from label-style lines, or array if no labels */
function buildSubsectionValue(subsection: ParsedSection): KeyValueSectionValue {
  const lines = flattenSectionToLines(subsection);
  const hasLabels = lines.some((l) => parseLabelValue(l) !== null);
  if (lines.length === 0) return "";
  if (hasLabels) return linesToKeyValue(lines) as Record<string, string>;
  return lines.map((s) => s.trim());
}

/** Turn a list of lines (labels and values) into one object. Label lines become keys; next line can be value. */
function linesToKeyValue(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let pendingKey: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseLabelValue(line);
    if (parsed) {
      if (pendingKey) {
        out[pendingKey] = "";
        pendingKey = null;
      }
      if (parsed.value) {
        out[parsed.key] = parsed.value;
      } else {
        const next = lines[i + 1];
        if (next !== undefined && next.trim() !== "" && !isLabelLike(next)) {
          out[parsed.key] = next.trim();
          i++;
        } else {
          pendingKey = parsed.key;
        }
      }
    } else if (pendingKey) {
      out[pendingKey] = trimmed;
      pendingKey = null;
    }
  }
  if (pendingKey) out[pendingKey] = "";
  return out;
}

/**
 * Normalize approach subsection key and value to match new-expected-json (station-md).
 * Some subsections map to nested keys (e.g. socrates_pain → pain_history.socrates);
 * others need shape normalization (arrays, wrapper objects).
 */
function normalizeApproachSubsection(
  subKey: string,
  value: KeyValueSectionValue
): { key: string; value: KeyValueSectionValue } {
  const toArr = (v: KeyValueSectionValue, fill = "") =>
    Array.isArray(v) ? [...v] : [typeof v === "string" && v ? v : fill];
  const padArr = (arr: string[], len: number, fill = "") =>
    arr.length >= len ? arr.slice(0, len) : [...arr, ...Array(len - arr.length).fill(fill)];

  switch (subKey) {
    case "grips":
      return { key: "grips", value: padArr(toArr(value), 1) };
    case "presenting_complaint": {
      let s = "";
      if (typeof value === "string") s = value;
      else if (Array.isArray(value)) s = value[0] ?? "";
      else if (value && typeof value === "object" && !Array.isArray(value)) {
        const o = value as Record<string, string>;
        s = o.presenting_complaint ?? "";
      }
      return { key: "presenting_complaint", value: { presenting_complaint: s } };
    }
    case "history_of_presenting_complaint":
      return { key: "history_of_presenting_complaint", value: padArr(toArr(value), 2) };
    case "socrates_pain":
    case "socrates":
      return { key: "pain_history", value: { socrates: value } as KeyValueSectionValue };
    case "odipara":
      return { key: "symptom_framework", value: { odipara: value } as KeyValueSectionValue };
    case "differential_diagnoses":
      return { key: "differential_diagnoses", value: padArr(toArr(value), 3) };
    case "red_flags":
      return { key: "red_flags", value: padArr(toArr(value), 3) };
    case "past_medical_history": {
      const o = (value && typeof value === "object" && !Array.isArray(value)) ? value as Record<string, string> : {};
      return {
        key: "past_medical_history",
        value: {
          past_medical_conditions: o.past_medical_conditions ?? o.conditions ?? "",
          medications: o.medications ?? "",
          allergies: o.allergies ?? "",
          family_history: o.family_history ?? "",
          travel_history: o.travel_history ?? "",
          occupation: o.occupation ?? "",
        },
      };
    }
    case "impact": {
      const o = (value && typeof value === "object" && !Array.isArray(value)) ? value as Record<string, string> : {};
      return {
        key: "impact",
        value: {
          daily_life_impact: o.daily_life_impact ?? o.daily_life ?? "",
          work_impact: o.work_impact ?? o.work ?? "",
          sleep_impact: o.sleep_impact ?? o.sleep ?? "",
        },
      };
    }
    case "examination": {
      const o = (value && typeof value === "object" && !Array.isArray(value)) ? value as Record<string, unknown> : {};
      const findings = Array.isArray(o.findings) ? o.findings as string[] : [];
      return {
        key: "examination",
        value: {
          general_examination: typeof o.general_examination === "string" ? o.general_examination : "",
          findings: padArr(findings, 3),
        },
      };
    }
    case "management": {
      const o = (value && typeof value === "object" && !Array.isArray(value)) ? value as Record<string, unknown> : {};
      const inv = o.investigations && typeof o.investigations === "object" && !Array.isArray(o.investigations)
        ? o.investigations as Record<string, unknown>
        : {};
      const important = Array.isArray(inv.important) ? (inv.important[0] ?? "") : (typeof inv.important === "string" ? inv.important : "");
      const routine = Array.isArray(inv.routine) ? (inv.routine[0] ?? "") : (typeof inv.routine === "string" ? inv.routine : "");
      return {
        key: "management",
        value: {
          admit_outpatient_care: typeof o.admit_outpatient_care === "string" ? o.admit_outpatient_care : (typeof o.care_plan === "string" ? o.care_plan : ""),
          investigations: { important, routine },
          referral_specialist: typeof o.referral_specialist === "string" ? o.referral_specialist : (typeof o.referral === "string" ? o.referral : ""),
          symptomatic_treatment: typeof o.symptomatic_treatment === "string" ? o.symptomatic_treatment : "",
          senior_review: typeof o.senior_review === "string" ? o.senior_review : "",
          patient_leaflets: typeof o.patient_leaflets === "string" ? o.patient_leaflets : "",
          follow_up: typeof o.follow_up === "string" ? o.follow_up : "",
          safety_netting: typeof o.safety_netting === "string" ? o.safety_netting : "",
        },
      };
    }
    default:
      return { key: subKey, value };
  }
}

/**
 * Convert Notion blocks into key-value JSON with nesting: ## sections as top-level keys,
 * ### subsections as nested objects or arrays. Approach subsections stay under approach
 * and are normalized to match new-expected-json (station-md) shape.
 */
export function notionBlocksToKeyValueJson(blocks: NotionBlock[]): KeyValuePage {
  const parsed = notionBlocksToStructuredJson(blocks);
  const result: KeyValuePage = {};
  for (const section of parsed.sections) {
    const sectionKey = toSlugKey(section.title);
    if (!sectionKey) continue;
    const sectionValue: Record<string, KeyValueSectionValue> = {};
    let flatLines: string[] = [];
    for (const child of section.children) {
      if ("title" in child && "level" in child && "children" in child) {
        if (flatLines.length) {
          Object.assign(sectionValue, linesToKeyValue(flatLines));
          flatLines = [];
        }
        const sub = child as ParsedSection;
        const subKey = toSlugKey(sub.title);
        if (!subKey) continue;
        const value = buildSubsectionValue(sub);
        if (sectionKey === "approach") {
          const { key, value: normValue } = normalizeApproachSubsection(subKey, value);
          sectionValue[key] = normValue;
        } else {
          sectionValue[subKey] = value;
        }
        continue;
      }
      const node = child as ContentNode;
      if (node.type === "paragraph") flatLines.push(node.text);
      else if (node.type === "bulleted_list") flatLines.push(...node.items);
      else if (node.type === "numbered_list") flatLines.push(...node.items);
      else if (node.type === "todo" || node.type === "quote" || node.type === "raw") flatLines.push(node.text);
      else if (node.type === "code") flatLines.push(node.text);
    }
    if (flatLines.length) Object.assign(sectionValue, linesToKeyValue(flatLines));
    result[sectionKey] = sectionValue;
  }
  return result;
}

/**
 * Parse the raw Notion API response into key-value JSON for the learning hub.
 */
export function parseNotionBlockResponseToKeyValue(response: unknown): KeyValuePage {
  const obj = response && typeof response === "object" ? response as Record<string, unknown> : {};
  const results = Array.isArray(obj.results) ? (obj.results as NotionBlock[]) : [];
  return notionBlocksToKeyValueJson(results);
}
