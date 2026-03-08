import React, { useEffect, useState } from "react";
import { getDatabasePages } from "./services/notionService";
import type { NotionPage } from "./types/notion";
import PageList from "./components/PageList/PageList";
import PageInspector from "./components/PageInspector/PageInspector";

const App: React.FC = () => {
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  useEffect(() => {
    getDatabasePages()
      .then(setPages)
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 ">
      <header className="shrink-0 px-4 py-3 sm:px-5 sm:py-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-semibold">UKMLACE JSON Inspector</h1>
      </header>
      <div className="flex flex-1 min-h-0 flex-row">
        <aside className="shrink-0 w-56 sm:w-64 h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col overflow-hidden">
          <div className="p-2 flex-1 overflow-y-auto min-h-0">
            <PageList
              pages={pages}
              selectedPageId={selectedPageId}
              onSelectPage={setSelectedPageId}
            />
          </div>
        </aside>
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden p-4">
          <PageInspector selectedPageId={selectedPageId} />
        </main>
      </div>
    </div>
  );
};

export default App;
