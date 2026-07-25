import React from 'react';
import { Waves, Smile, Shirt, Circle, Square, Triangle, Hexagon, Diamond, Star, Image as ImageIcon, Zap, Bell, Moon, Sun, X, LayoutGrid, StickyNote } from 'lucide-react';

export const MimiZineLayout: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = React.useState(true);
  const [isActionToolbarOpen, setIsActionToolbarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full bg-nous-base text-nous-text overflow-hidden">
      {/* Black Sidebar Container */}
      <aside className="relative bg-nous-text text-nous-base flex border-r border-nous-border z-50">
        {/* Spine */}
        <div className="w-16 flex flex-col items-center py-6">
          <div className="flex flex-col gap-8 cursor-pointer" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-3 h-6 bg-stone-700 rounded-none hover:bg-nous-base0 transition-colors"></div>
            ))}
          </div>
        </div>

        {/* Drawer */}
        <div className={`bg-black border-r border-nous-border overflow-hidden transition-all duration-300 ease-in-out ${isDrawerOpen ? 'w-64' : 'w-0'}`}>
          <div className="w-64 p-6 text-nous-subtle font-sans text-sm">
            <h2 className="uppercase tracking-widest mb-6 text-white">Menu</h2>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-nous-text transition-colors">Dashboard</a></li>
              <li><a href="#" className="hover:text-nous-text transition-colors">Studio</a></li>
              <li><a href="#" className="hover:text-nous-text transition-colors">Library</a></li>
              <li><a href="#" className="hover:text-nous-text transition-colors">Settings</a></li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="px-12 py-8 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-serif text-4xl italic">Mimi</h1>
            <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-nous-subtle">A CREATIVE SANCTUARY FOR YOUR DIGITAL THREADS.</p>
            <p className="font-sans text-[8px] uppercase tracking-[0.2em] text-nous-subtle">HOME / STUDIO</p>
          </div>
          <div className="flex gap-4 text-nous-subtle">
            <Zap size={16} className="hover:text-nous-text transition-colors cursor-pointer" />
            <Moon size={16} className="hover:text-nous-text transition-colors cursor-pointer" />
            <Sun size={16} className="hover:text-nous-text transition-colors cursor-pointer" />
            <Bell size={16} className="hover:text-nous-text transition-colors cursor-pointer" />
          </div>
        </header>

        <div className="flex-1 flex">
          {/* Left Column */}
          <div className="w-[35%] max-w-[450px] p-12 flex flex-col gap-8">
            <div className="font-sans text-[9px] uppercase tracking-[0.3em] text-nous-subtle font-bold">AUTO AWESOME TITLE</div>
            <input
              type="text"
              placeholder="ENTER ZINE TITLE..."
              className="w-full bg-transparent border-b border-nous-border pb-2 text-sm uppercase tracking-widest text-nous-subtle placeholder:text-nous-subtle outline-none"
            />

            <div className="border border-nous-border rounded-none p-8 flex flex-col gap-6 bg-white/50">
              <div className="flex justify-end gap-3 text-nous-subtle">
                <ImageIcon size={14} />
                <ImageIcon size={14} />
                <ImageIcon size={14} />
              </div>
              <div className="text-center text-nous-subtle font-serif italic text-sm flex flex-col gap-2">
                <p>A</p>
                <p>Taste Graph</p>
                <p>Signature</p>
                <p>Narrative Threads</p>
                <p>Feed???????</p>
                <p>For inspo</p>
              </div>
            </div>
            <a href="#" className="font-sans text-[9px] uppercase tracking-[0.2em] text-nous-subtle hover:text-nous-text transition-colors">INCLUDE IN ZINE ANALYSIS OPTION</a>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col items-center justify-center relative p-12">
            <div className="text-center flex flex-col gap-3">
              <p className="font-sans text-[9px] uppercase tracking-[0.3em] text-nous-subtle">PROMPT CYCLE 6: TRACE THE LINEAGE OF AN IDEA.</p>
              <h1 className="text-5xl font-serif italic text-nous-text">The specific mood of...</h1>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-12 py-8 flex justify-end items-end">
          <div className="flex gap-8 font-sans text-[9px] uppercase tracking-[0.2em] text-nous-subtle">
            <a href="#">PRIVACY</a>
            <a href="#">COMMUNITY</a>
          </div>
        </footer>
      </main>

      {/* Right Action Controls */}
      <div className="fixed bottom-16 right-16 z-50 flex flex-col items-end gap-4">
        <button
          onClick={() => setIsActionToolbarOpen(!isActionToolbarOpen)}
          className="p-3 bg-nous-base border border-nous-border text-nous-subtle hover:text-nous-text transition-colors"
        >
          {isActionToolbarOpen ? <X size={20} /> : <StickyNote size={20} />}
        </button>
        {isActionToolbarOpen && (
          <div className="flex flex-col gap-4 bg-nous-base border border-nous-border p-4">
            <button className="flex items-center gap-2 text-nous-subtle hover:text-nous-text transition-colors">
              <Waves size={20} strokeWidth={1.5} />
              <span className="font-sans text-[9px] uppercase tracking-[0.2em]">SIGNAL</span>
            </button>
            <button className="flex items-center gap-2 text-nous-subtle hover:text-nous-text transition-colors">
              <Smile size={20} strokeWidth={1.5} />
              <span className="font-sans text-[9px] uppercase tracking-[0.2em]">ROOT</span>
            </button>
            <button className="flex items-center gap-2 text-nous-subtle hover:text-nous-text transition-colors">
              <Shirt size={20} strokeWidth={1.5} />
              <span className="font-sans text-[9px] uppercase tracking-[0.2em]">TAILOR</span>
            </button>
          </div>
        )}
      </div>

      {/* Far-Right Vertical Toolbar */}
      <div className={`fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-8 text-nous-subtle transition-all duration-300 ${isToolbarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Circle size={14} strokeWidth={1.5} />
        <Square size={14} strokeWidth={1.5} />
        <Triangle size={14} strokeWidth={1.5} />
        <Hexagon size={14} strokeWidth={1.5} />
        <Diamond size={14} strokeWidth={1.5} />
        <Star size={14} strokeWidth={1.5} />
      </div>
      <button
        onClick={() => setIsToolbarOpen(!isToolbarOpen)}
        className="fixed right-8 top-16 z-50 text-nous-subtle hover:text-nous-text transition-colors"
      >
        {isToolbarOpen ? <X size={16} /> : <LayoutGrid size={16} />}
      </button>
    </div>
  );
};
