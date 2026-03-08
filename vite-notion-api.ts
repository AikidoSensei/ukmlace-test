import type { Plugin } from "vite";
import { Client } from "@notionhq/client";

export function notionApiPlugin(env: Record<string, string>): Plugin {
  const token = env.NOTION_TOKEN ?? env.VITE_NOTION_TOKEN;
  const databaseId = env.NOTION_DATABASE_ID ?? env.VITE_NOTION_DATABASE_ID;

  return {
    name: "notion-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/api/notion/pages") && req.method === "GET") {
          if (!token || !databaseId) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID in .env",
              })
            );
            return;
          }
          try {
            const notion = new Client({ auth: token });
            const db = await notion.databases.retrieve({
              database_id: databaseId,
            });
            if (
              db.object !== "database" ||
              !("data_sources" in db) ||
              db.data_sources.length === 0
            ) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify([]));
              return;
            }
            const dataSourceId = db.data_sources[0].id;
            const response = await notion.dataSources.query({
              data_source_id: dataSourceId,
              page_size: 5,
            });
            const pageList = response.results
              .filter(
                (p): p is typeof p & { object: "page" } => p.object === "page"
              )
              .map((p) => {
                const titleProp =
                  "properties" in p &&
                  (p.properties.Name ??
                    p.properties.Title ??
                    Object.values(p.properties).find(
                      (v) =>
                        v &&
                        typeof v === "object" &&
                        "title" in v
                    ));
                const title =
                  titleProp &&
                  typeof titleProp === "object" &&
                  "title" in titleProp &&
                  Array.isArray(titleProp.title)
                    ? (titleProp.title[0] as { plain_text?: string } | undefined)
                        ?.plain_text ?? "No title"
                    : "No title";
                return { id: p.id, title };
              });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(pageList));
          } catch (err) {
            console.error(err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : "Notion API error",
              })
            );
          }
          return;
        }
        const blocksMatch = req.url?.match(/^\/api\/notion\/blocks\/([^/]+)$/);
        if (blocksMatch && req.method === "GET") {
          const pageId = blocksMatch[1];
          if (!token) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: "Missing NOTION_TOKEN in .env" })
            );
            return;
          }
          try {
            const notion = new Client({ auth: token });
            const response = await notion.blocks.children.list({
              block_id: pageId,
            });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(response));
          } catch (err) {
            console.error(err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : "Notion API error",
              })
            );
          }
          return;
        }
        next();
      });
    },
  };
}
