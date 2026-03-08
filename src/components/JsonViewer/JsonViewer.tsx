import React from "react";
import { JsonView, defaultStyles, allExpanded } from "react-json-view-lite";
import "./JsonViewer.css";

interface JsonViewerProps {
  data: unknown;
}

const customStyles: Partial<typeof defaultStyles> = {
  container: "rjl-container",
  basicChildStyle: "rjl-basic-child",
  childFieldsContainer: "rjl-child-fields",
  expandIcon: "rjl-expand-icon",
  collapseIcon: "rjl-collapse-icon",
  collapsedContent: "rjl-collapsed-content",
  label: "rjl-label",
  clickableLabel: "rjl-clickable-label",
  punctuation: "rjl-punctuation",
  nullValue: "rjl-null",
  undefinedValue: "rjl-undefined",
  numberValue: "rjl-number",
  stringValue: "rjl-string",
  booleanValue: "rjl-boolean",
  otherValue: "rjl-other",
};

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const viewData =
    data !== null && typeof data === "object"
      ? data
      : { value: data };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-green-500">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">
        Raw JSON
      </h2>
      <div className="flex-1 min-h-0 min-w-0 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 border-radius-lg">
        <JsonView
          data={viewData as object}
          style={{ ...defaultStyles, ...customStyles }}
          shouldExpandNode={allExpanded}
          clickToExpandNode
        />
      </div>
    </div>
  );
};

export default JsonViewer;
