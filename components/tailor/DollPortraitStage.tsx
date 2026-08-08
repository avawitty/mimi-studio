import React, { Suspense, lazy, useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { Doll } from "../../types";
import { resolveIdentityViewUrl, type DollIdentityView } from "../../services/dollEngine";

const DollPortraitScene = lazy(() =>
  import("./DollPortraitScene").then((m) => ({ default: m.DollPortraitScene })),
);

interface DollPortraitStageProps {
  doll: Doll;
  className?: string;
  view?: DollIdentityView;
}

export const DollPortraitStage: React.FC<DollPortraitStageProps> = ({
  doll,
  className = "",
  view = "portrait",
}) => {
  const identityUrl = resolveIdentityViewUrl(doll, view);
  const accent = doll.palette[0] || "#a8b79f";
  const secondary = doll.palette[1] || "#525252";

  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < doll.id.length; i += 1) h = (h * 31 + doll.id.charCodeAt(i)) | 0;
    return Math.abs(h);
  }, [doll.id]);

  return (
    <div className={`relative overflow-hidden bg-stone-950 ${className}`}>
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-stone-600" />
          </div>
        }
      >
        <DollPortraitScene accent={accent} secondary={secondary} seed={seed} />
      </Suspense>
      {identityUrl ? (
        <img
          src={identityUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_18%] mix-blend-lighten opacity-70 pointer-events-none"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};
