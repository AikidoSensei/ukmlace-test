// src/types/notion.d.ts
export interface NotionText {
    type: "text";
    text: {
      content: string;
      link?: string | null;
    };
    annotations: {
      bold: boolean;
      italic: boolean;
      underline: boolean;
      strikethrough: boolean;
      code: boolean;
      color: string;
    };
    plain_text: string;
    href: string | null;
  }
  
  export interface NotionBlock {
    object: "block";
    id: string;
    type: string;
    has_children: boolean;
    [key: string]: any;
  }