const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const \[audioProgress, setAudioProgress\] = useState\(0\);/,
  `const [audioProgress, setAudioProgress] = useState(0);\n  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);`
);

content = content.replace(
  /\{\/\* MINIMALIST FOOTER \*\/\}\n\s*\<div className="fixed bottom-8 left-1\/2 -translate-x-1\/2 z-\[9999\] flex items-center gap-8 px-10 py-4 bg-white\/90 \/90 backdrop-blur-xl border border-nous-border \/10 text-nous-subtle text-nous-text\/70 font-mono text-\[10px\] uppercase tracking-\[0\.2em\] print:hidden shadow-2xl rounded-none"\>[\s\S]*?\<\/div\>\n\s*\<\/div\>/,
  `{/* MINIMALIST FOOTER */}
  <motion.div 
    initial={false}
    animate={{ y: isToolbarCollapsed ? 100 : 0, opacity: isToolbarCollapsed ? 0 : 1 }}
    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-8 px-10 py-4 bg-white/90 /90 backdrop-blur-xl border border-nous-border /10 text-nous-subtle text-nous-text/70 font-mono text-[10px] uppercase tracking-[0.2em] print:hidden shadow-2xl rounded-none"
  >
    <span className="text-nous-subtle text-nous-text/50">RESONANCE: 98%</span>
    <div className="w-px h-4 bg-stone-200 /20"/>
    
    <div className="flex items-center gap-3 group cursor-pointer" onClick={handleVoiceToggle}>
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-nous-border /20 group-hover:border-nous-border dark:group-hover:border-white/50 transition-colors">
        {isVoiceLoading ? (
          <Loader2 size={12} className="animate-spin text-nous-subtle text-nous-text/70"/>
        ) : isPlaying ? (
          <Pause size={10} className="text-nous-subtle text-nous-text/70 group-hover:text-nous-text dark:group-hover:text-nous-text"/>
        ) : (
          <Play size={10} className="text-nous-subtle text-nous-text/70 group-hover:text-nous-text dark:group-hover:text-nous-text ml-0.5"/>
        )}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="94.2" strokeDashoffset={94.2 - (audioProgress * 94.2)} className="text-nous-text text-nous-text transition-all duration-100"/>
        </svg>
      </div>
      <span className="group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors">[ THE DIAL ]</span>
    </div>

    <div className="w-px h-4 bg-stone-200 /20"/>
    <button onClick={() => setShowNotes(!showNotes)} className={\`\${showNotes ? 'text-nous-text text-nous-text' : 'hover:text-nous-text hover:text-nous-text'} transition-colors\`}>
      [ FIELD NOTES ]
    </button>
    <div className="w-px h-4 bg-stone-200 /20"/>
    <button onClick={() => setShowExport(true)} className="hover:text-nous-text hover:text-nous-text transition-colors">
      [ EXTRACT ARTIFACT ]
    </button>
    <div className="w-px h-4 bg-stone-200 /20"/>
    <button onClick={handleSaveToPocket} className={\`\${isSaved ? 'text-red-500' : 'hover:text-red-500'} transition-colors flex items-center gap-2\`}>
      [ {isSaved ? <Heart className="fill-current" size={12} /> : <Heart size={12} />} SAVE ]
    </button>
    <div className="w-px h-4 bg-stone-200 /20"/>
    <button onClick={() => setShowComments(true)} className="hover:text-nous-text hover:text-nous-text transition-colors flex items-center gap-2">
      [ <MessageSquare size={12} /> DISCUSS ]
    </button>
    <div className="w-px h-4 bg-stone-200 /20"/>
    <button onClick={() => setIsToolbarCollapsed(true)} className="hover:text-nous-text hover:text-nous-text transition-colors flex items-center gap-2">
      [ <ChevronDown size={12} /> HIDE ]
    </button>
  </motion.div>

  <AnimatePresence>
    {isToolbarCollapsed && (
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={() => setIsToolbarCollapsed(false)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-6 py-3 bg-white/90 /90 backdrop-blur-xl border border-nous-border /10 text-nous-subtle text-nous-text/70 font-mono text-[10px] uppercase tracking-[0.2em] print:hidden shadow-2xl rounded-none hover:text-nous-text transition-colors"
      >
        [ SHOW TOOLBAR ]
      </motion.button>
    )}
  </AnimatePresence>
  </div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced toolbar');
