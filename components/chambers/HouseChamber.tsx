import React, { useCallback } from "react";
import { ChamberShell } from "./ChamberShell";
import HouseStudio from "../house/HouseStudio";
import "../house/house.css";

interface HouseChamberProps {
  issueId?: string | null;
  navigate?: (path: string) => void;
}

/**
 * The House — four-floor editorial loop (Ingest → Curate → Plate → Penthouse).
 * Local-first taste studio ported from the mimi.studio House prototype, adapted
 * to House Style v2 and wired as a first-class chamber.
 */
export const HouseChamber: React.FC<HouseChamberProps> = ({ issueId, navigate }) => {
  const onNavigateIssue = useCallback(
    (id: string) => {
      navigate?.(`/house/issue/${id}`);
    },
    [navigate],
  );

  const onClearIssue = useCallback(() => {
    navigate?.("/house");
  }, [navigate]);

  return (
    <ChamberShell moduleId="house" hideHeader hideHandoff>
      <div className="h-full min-h-0 overflow-y-auto px-4 md:px-8 pb-10">
        <HouseStudio
          issueId={issueId}
          onNavigateIssue={onNavigateIssue}
          onClearIssue={onClearIssue}
        />
      </div>
    </ChamberShell>
  );
};
