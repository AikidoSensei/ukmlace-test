import { Client } from "@notionhq/client";

export const config = { runtime: "nodejs" };

export async function GET() {
  const token = process.env.NOTION_TOKEN ?? process.env.VITE_NOTION_TOKEN;
  const databaseId =
    process.env.NOTION_DATABASE_ID ?? process.env.VITE_NOTION_DATABASE_ID;

  if (!token || !databaseId) {
    return new Response(
      JSON.stringify({
        error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID in environment",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const notion = new Client({ auth: token });
    const db = await notion.databases.retrieve({ database_id: databaseId });
    if (
      db.object !== "database" ||
      !("data_sources" in db) ||
      db.data_sources.length === 0
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const dataSourceId = db.data_sources[0].id;
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
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
              (v) => v && typeof v === "object" && "title" in v
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
    return new Response(JSON.stringify(pageList), {
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
