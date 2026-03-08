import React, { useEffect, useState } from "react";
import { getDatabasePages } from "./services/notionService";
import type { NotionPage } from "./types/notion";
import PageList from "./components/PageList/PageList";
import PageInspector from "./components/PageInspector/PageInspector";

const MOBILE_BREAKPOINT = 640; // px — same as Tailwind's sm

const App: React.FC = () => {
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    getDatabasePages().then(setPages).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    if (isMobile) setSidebarOpen(false);
  };

  const sidebarStyle: React.CSSProperties = {
    backgroundColor: "#f9fafb", // solid light gray — no transparency
    borderRight: "1px solid #e5e7eb",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", overflow: "hidden", backgroundColor: "#fff", color: "#111" }}>

      {/* ─── Header ─── */}
      <header style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fff", flexShrink: 0, position: "relative", zIndex: 50 }}>
        {/* Toggle button – only on mobile */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            style={{ flexShrink: 0, width: "2.25rem", height: "2.25rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 400, borderRadius: "0.5rem", border: "1px solid #d1d5db", background: "#f3f4f6", cursor: "pointer", lineHeight: 1, color: "#374151" }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "−" : "+"}
          </button>
        )}
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          UKMLACE JSON Inspector
        </h1>
      </header>

      {/* ─── Body ─── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>

        {/* Backdrop – mobile only, when sidebar open */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "absolute", inset: 0, zIndex: 30, backgroundColor: "rgba(0,0,0,0.4)" }}
          />
        )}

        {/* Sidebar */}
        <aside
          style={{
            ...sidebarStyle,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
            zIndex: 40,
            // Desktop: always visible, in normal flow
            ...(isMobile
              ? {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "min(18rem, 85vw)",
                  transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                  transition: "transform 200ms ease-out",
                  boxShadow: sidebarOpen ? "4px 0 12px rgba(0,0,0,0.15)" : "none",
                }
              : {
                  position: "relative",
                  width: "16rem",
                }),
          }}
        >
          <div style={{ flexShrink: 0, padding: "0.5rem 0.75rem", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>Pages</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            <PageList
              pages={pages}
              selectedPageId={selectedPageId}
              onSelectPage={handleSelectPage}
            />
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "scroll", padding: "1rem" }}>
          <PageInspector selectedPageId={selectedPageId} />
        </main>

      </div>
    </div>
  );
};

export default App;
