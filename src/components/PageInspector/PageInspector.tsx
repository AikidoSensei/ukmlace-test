import React, { useEffect, useMemo, useState } from "react";
import { getPageBlocks } from "../../services/notionService";
import { parseNotionBlockResponse } from "../../parser/notionPageParser";
import JsonViewer from "../JsonViewer/JsonViewer";

interface PageInspectorProps {
  selectedPageId: string | null;
}

const PageInspector: React.FC<PageInspectorProps> = ({ selectedPageId }) => {
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPageId) {
      setRawResponse(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPageBlocks(selectedPageId)
      .then((data) => {
        if (!cancelled) {
          setRawResponse(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load blocks");
          setRawResponse(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPageId]);

  if (!selectedPageId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        Select a page to inspect its block JSON.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        Loading blocks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  const parsed = useMemo(
    () => (rawResponse ? parseNotionBlockResponse(rawResponse) : null),
    [rawResponse]
  );
  const [viewMode, setViewMode] = useState<"raw" | "parsed">("parsed");
  const dataToShow = viewMode === "parsed" && parsed ? parsed : rawResponse;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
        <button
          type="button"
          onClick={() => setViewMode("raw")}
          className={`px-2 py-1 rounded text-sm ${viewMode === "raw" ? "bg-gray-200 dark:bg-gray-700 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
        >
          Raw
        </button>
        <button
          type="button"
          onClick={() => setViewMode("parsed")}
          className={`px-2 py-1 rounded text-sm ${viewMode === "parsed" ? "bg-gray-200 dark:bg-gray-700 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
        >
          Parsed
        </button>
      </div>
      <JsonViewer data={dataToShow} />
    </div>
  );
};

export default PageInspector;
