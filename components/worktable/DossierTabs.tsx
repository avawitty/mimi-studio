import React from "react";

export type DossierFolder = {
  id: string;
  /** Short mono label e.g. INTAKE */
  label: string;
  /** Display name */
  name: string;
  /** Optional route / viewMode */
  mode?: string;
};

type DossierTabsProps = {
  folders: DossierFolder[];
  activeId: string;
  onSelect: (folder: DossierFolder) => void;
  /** Force orientation; default responds to viewport via CSS */
  orientation?: "auto" | "vertical" | "horizontal";
  className?: string;
};

/**
 * WT-002 — Manila folder tabs: vertical desktop (spine), horizontal mobile rail.
 */
export const DossierTabs: React.FC<DossierTabsProps> = ({
  folders,
  activeId,
  onSelect,
  orientation = "auto",
  className = "",
}) => {
  const vertical = orientation === "vertical";
  const horizontal = orientation === "horizontal";

  if (vertical) {
    return (
      <nav
        data-specimen="WT-002"
        aria-label="Dossier folders"
        className={`hidden lg:flex flex-col gap-1 sticky top-4 self-start py-2 ${className}`.trim()}
      >
        {folders.map((folder) => {
          const active = folder.id === activeId;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelect(folder)}
              aria-current={active ? "page" : undefined}
              className="group relative flex items-stretch text-left min-h-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mimi-cobalt,#9bb8ce)]"
            >
              <span
                className="w-3 shrink-0 border border-r-0 rounded-l-[2px]"
                style={{
                  background: active
                    ? "var(--mimi-manila-tab, #e8dcb5)"
                    : "var(--mimi-manila-body, #f0e6c8)",
                  borderColor: "var(--mimi-manila-edge, #c9ba86)",
                }}
              />
              <span
                className="flex-1 px-3 py-2 border rounded-r-[2px] flex flex-col justify-center gap-0.5"
                style={{
                  background: active
                    ? "var(--mimi-manila-tab, #e8dcb5)"
                    : "var(--mimi-manila-body, #f0e6c8)",
                  borderColor: "var(--mimi-manila-edge, #c9ba86)",
                }}
              >
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.32em]"
                  style={{ color: "var(--mimi-manila-ink, #5c5334)" }}
                >
                  {folder.label}
                </span>
                <span
                  className="font-serif text-[12px] leading-tight"
                  style={{ color: "var(--mimi-manila-ink, #5c5334)" }}
                >
                  {folder.name}
                </span>
              </span>
              {active && (
                <span
                  aria-hidden
                  className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--wt-seal, var(--mimi-seal, #c33b32))" }}
                />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  /* ─── Mobile: Horizontal bottom rail — elevator buttons ────── */
  if (horizontal || orientation === "auto") {
    return (
      <nav
        data-specimen="WT-002"
        aria-label="Dossier folders"
        className={`flex lg:hidden overflow-x-auto gap-1 px-2 py-2 border-t ${
          horizontal ? "" : ""
        } ${className}`.trim()}
        style={{
          borderColor: "var(--mimi-manila-edge, #c9ba86)",
          background: "var(--mimi-manila-body, #f0e6c8)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {folders.map((folder) => {
          const active = folder.id === activeId;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelect(folder)}
              aria-current={active ? "page" : undefined}
              className="relative shrink-0 min-h-12 min-w-[4.5rem] px-3 py-2 border rounded-t-[2px] flex flex-col items-center justify-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mimi-cobalt,#9bb8ce)]"
              style={{
                background: active
                  ? "var(--mimi-manila-tab, #e8dcb5)"
                  : "var(--mimi-manila-sheet, #f7f3e8)",
                borderColor: "var(--mimi-manila-edge, #c9ba86)",
              }}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--wt-seal, var(--mimi-seal, #c33b32))" }}
                />
              )}
              <span
                className="font-mono text-[8px] uppercase tracking-[0.28em]"
                style={{ color: "var(--mimi-manila-ink, #5c5334)" }}
              >
                {folder.label}
              </span>
              <span
                className="font-serif text-[11px] leading-tight"
                style={{ color: "var(--mimi-manila-ink, #5c5334)" }}
              >
                {folder.name}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return null;
};

/**
 * Desktop spine + mobile rail pair. Renders both; CSS/orientation hide one.
 */
export const DossierTabsPair: React.FC<
  Omit<DossierTabsProps, "orientation">
> = (props) => (
  <>
    <DossierTabs {...props} orientation="vertical" />
    {/* Mobile rail is placed by parent at bottom; this helper is optional */}
  </>
);
