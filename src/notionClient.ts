import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: import.meta.env.VITE_NOTION_TOKEN,
  fetch: (url, init) => fetch(url, init),
});