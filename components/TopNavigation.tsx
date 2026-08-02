import React from 'react';

interface MenuItem {
 label: string;
 viewMode: string;
 note: string;
}

interface TopNavigationProps {
 currentViewMode: string;
 setViewMode: (mode: string) => void;
 onOpenCommandDrawer: () => void;
 isGenerating?: boolean;
 isLoading?: boolean;
 isHighLatency?: boolean;
}

const MENU_STRUCTURE = [
 { section: 'Studio', items: [
 { mode: 'editorial-home', label: 'Mimi Front Page', note: 'Zine Editorial Cover' },
 { mode: 'studio', label: 'Work Table', note: 'The Artifact Engine' },
 { mode: 'pocket', label: 'Pocket Registry', note: 'Curated Items & Saved Zines' },
 { mode: 'brand-intake', label: 'Brand OS', note: 'Intake & Memory' },
 { mode: 'tailor', label: 'Tailor Tools', note: 'Materiality & Layout' },
 { mode: 'dossier', label: 'Canvas', note: 'Infinite Space' }
 ]},
 { section: 'Signature', items: [
 { mode: 'signature', label: 'Dashboard', note: 'Identity & Analysis' },
 { mode: 'publisher', label: 'Publisher Console', note: 'Reach & Sponsorship KPI' },
 { mode: 'ward', label: 'The Ward', note: 'Calibration Ritual' },
 { mode: 'profile', label: 'Profile', note: 'Settings & Keys' }
 ]},
 { section: 'Archive', items: [
 { mode: 'pocket', label: 'Pocket Vault', note: 'Saved Zines & Specimens' },
 { mode: 'archival', label: 'Library', note: 'Creative Memory' },
 { mode: 'the-lens', label: 'The Lens', note: 'Spatial Aesthetic Capture' },
 { mode: 'obsidian-mirror', label: 'Obsidian Mirror', note: 'Lyria Story & Song Engine' },
 { mode: 'darkroom', label: 'Darkroom', note: 'Unprocessed Fragments' }
 ]},
 { section: 'Threads', items: [
 { mode: 'narrative-threads', label: 'Narrative Pathing', note: 'Semantic Paths' },
 { mode: 'scry', label: 'Trace & Scry', note: 'Aesthetic Drift Prediction' }
 ]},
 { section: 'Floor', items: [
 { mode: 'stand', label: 'The Stand', note: 'Your Published Showcase' },
 { mode: 'nebula', label: 'Resonance Feed', note: 'Community Floor' },
 { mode: 'press', label: 'Forecast Edit', note: 'Ad Profile & Affiliates' },
 { mode: 'proscenium', label: 'Proscenium', note: 'Stage · Correspondents · Cliques' }
 ]},
 { section: 'System', items: [
 { mode: 'syllabus', label: 'The Syllabus', note: 'Bimbo Intellectual Reading List' },
 { mode: 'forecast', label: 'Forecast', note: 'Aesthetic Meteorology' },
 { mode: 'qc_engine', label: 'QC Engine', note: 'Image Color Control' },
 { mode: 'manifesto', label: 'Manifesto', note: 'Community & Ethos' },
 { mode: 'codex', label: 'Codex', note: 'Documentation' }
 ]}
];

export const TopNavigation: React.FC<TopNavigationProps> = ({ 
 currentViewMode, 
 setViewMode, 
 onOpenCommandDrawer,
 isGenerating = false,
 isLoading = false,
 isHighLatency = false
}) => {
 if (isLoading) {
  return (
   <nav className="flex items-center gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
     <div key={i} className="h-3 w-14 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-none" />
    ))}
   </nav>
  );
 }

 return (
  <nav className="flex items-center gap-6">
   {MENU_STRUCTURE.map((section, index) => {
    const isSectionActive = section.items.some(item => item.mode === currentViewMode);
    return (
     <React.Fragment key={section.section}>
      <div className="relative group">
       <button className={`font-sans text-[10px] uppercase tracking-[0.2em] font-medium transition-colors ${
        isGenerating ? 'cursor-wait opacity-80' : 'cursor-pointer hover:text-nous-text'
       } ${isSectionActive ? 'text-nous-text font-bold' : 'text-nous-subtle'}`}>
        {section.section}
        {isHighLatency && isSectionActive && (
         <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1 animate-pulse" title="High Latency Network Endpoint" />
        )}
       </button>
       <div className="absolute top-full left-0 pt-2 w-52 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-[5000]">
        <div className="bg-white dark:bg-[#0d0d0d] border border-nous-border p-3.5 flex flex-col gap-1.5 shadow-xl">
         {isGenerating && (
          <div className="px-2 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[8px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
           <span>Synthesizing...</span>
           <span className="animate-spin">⟳</span>
          </div>
         )}
         {section.items.map((item) => {
          const isActive = currentViewMode === item.mode;
          return (
           <button
            key={item.mode}
            disabled={isGenerating}
            onClick={() => {
             if (!isGenerating) {
              setViewMode(item.mode);
             }
            }}
            className={`text-[10px] uppercase tracking-[0.1em] text-left transition-colors px-2 py-1.5 ${
             isGenerating ? 'cursor-not-allowed opacity-60' : 'hover:text-nous-text hover:bg-stone-100 dark:hover:bg-stone-900 cursor-pointer'
            } ${isActive ? 'text-amber-600 dark:text-amber-400 font-bold bg-stone-100/80 dark:bg-stone-900/80' : 'text-nous-subtle'}`}
           >
            {item.label}
           </button>
          );
         })}
        </div>
       </div>
      </div>
      {index < MENU_STRUCTURE.length - 1 && (
       <span className="text-nous-subtle opacity-40">/</span>
      )}
     </React.Fragment>
    );
   })}
   <button 
    disabled={isGenerating}
    onClick={onOpenCommandDrawer}
    className={`font-sans text-[10px] uppercase tracking-[0.2em] font-medium text-nous-subtle hover:text-nous-text transition-colors ${
     isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
    }`}
   >
    Command
   </button>
  </nav>
 );
};
