import React from "react";
import type { NotionPage } from "../../types/notion";

interface PageListProps {
  pages: NotionPage[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
}

const PageList: React.FC<PageListProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
}) => {
  return (
    <div className="flex flex-col h-full min-w-0">
      <ul className="flex-1 overflow-y-auto list-none p-0 m-0 space-y-0.5">
        {pages.map((page) => (
          <li key={page.id}>
            <button
              type="button"
              onClick={() => onSelectPage(page.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedPageId === page.id
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
              }`}
            >
              {page.title || "Untitled"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PageList;
