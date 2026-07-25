import React, { useState } from "react";
import { ExternalLink, Sparkles, Wand2, Compass } from "lucide-react";
import { ChamberShell } from "./ChamberShell";
import { MimiYouHub } from "../tailor/MimiYouHub";
import { useUser } from "../../contexts/UserContext";
import { ProceduralDollStudio } from "./ProceduralDollStudio";

interface MimiDollsChamberProps {
  navigate: (path: string) => void;
}

export const MimiDollsChamber: React.FC<MimiDollsChamberProps> = ({ navigate }) => {
  const { user, profile } = useUser();
  const [chamberView, setChamberView] = useState<'dresser' | 'hub'>('dresser');
  const handle =
    profile?.handle ||
    user?.email?.split("@")[0]?.replace(/\s+/g, "-").toLowerCase() ||
    user?.uid?.slice(0, 8) ||
    "me";

  const openPublicProfile = () => {
    navigate(`/u/${handle}`);
  };

  return (
    <ChamberShell
      moduleId="mimi-dolls"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChamberView(chamberView === 'dresser' ? 'hub' : 'dresser')}
            className="px-3 py-1.5 border border-purple-500 bg-purple-500/10 font-mono text-[8px] uppercase tracking-widest text-purple-300 hover:bg-purple-500/20 flex items-center gap-1.5"
          >
            {chamberView === 'dresser' ? (
              <>
                <Compass size={11} /> Universe Hub
              </>
            ) : (
              <>
                <Wand2 size={11} /> 3D Dresser Studio
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/tailor")}
            className="px-3 py-1.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest hover:bg-nous-base0/30"
          >
            Tailor Genome
          </button>
          <button
            type="button"
            onClick={openPublicProfile}
            className="px-3 py-1.5 border border-nous-border font-mono text-[8px] uppercase tracking-widest flex items-center gap-1 hover:bg-nous-base0/30"
          >
            Public Card <ExternalLink size={10} />
          </button>
        </div>
      }
    >
      {chamberView === 'dresser' ? (
        <ProceduralDollStudio />
      ) : !user?.uid ? (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <Sparkles className="text-nous-subtle" size={24} />
          <p className="font-serif italic text-xl text-nous-text">Sign in to manage your editorial doll.</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("mimi:open_gateway"))}
            className="font-mono text-[9px] uppercase tracking-widest px-6 py-3 bg-nous-text text-nous-base"
          >
            Enter Mimi
          </button>
        </div>
      ) : (
        <MimiYouHub userId={user.uid} handle={handle} navigate={navigate} />
      )}
    </ChamberShell>
  );
};
