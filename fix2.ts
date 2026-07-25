import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walk(dirPath, callback);
    else callback(dirPath);
  });
}

walk('./components', (file) => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');

  // Fix duplicated prefixes like "dark:border-nous-base/20 dark:border-nous-text/20"
  content = content.replace(/bg-nous-text\/(\d+)\s+dark:bg-nous-base0?\/\1/g, 'bg-nous-text/$1 dark:bg-nous-base/$1');
  content = content.replace(/dark:bg-nous-text\/(\d+)\s+dark:bg-nous-base0?\/\1/g, '');
  content = content.replace(/bg-nous-text\/(\d+)\s+dark:bg-nous-base\/(\d+)\s+dark:bg-nous-text\/\1\s+dark:bg-nous-base\/\2/g, 'bg-nous-text/$1 dark:bg-nous-base/$2');

  content = content.replace(/border-nous-text\/(\d+)\s+dark:border-nous-base0?\/\1/g, 'border-nous-text/$1 dark:border-nous-base/$1');
  content = content.replace(/dark:border-nous-text\/(\d+)\s+dark:border-nous-base0?\/\1/g, '');
  content = content.replace(/border-nous-text\/(\d+)\s+dark:border-nous-base\/(\d+)\s+dark:border-nous-text\/\1\s+dark:border-nous-base\/\2/g, 'border-nous-text/$1 dark:border-nous-base/$2');

  content = content.replace(/text-nous-text\/(\d+)\s+dark:text-nous-base0?\/\1/g, 'text-nous-text/$1 dark:text-nous-base/$1');
  content = content.replace(/dark:text-nous-text\/(\d+)\s+dark:text-nous-base0?\/\1/g, '');
  content = content.replace(/text-nous-text\/(\d+)\s+dark:text-nous-base\/(\d+)\s+dark:text-nous-text\/\1\s+dark:text-nous-base\/\2/g, 'text-nous-text/$1 dark:text-nous-base/$2');

  if (file.includes('TasteGraph.tsx')) {
    content = content.replace(/<div className="w-2 h-2 bg"\/>\n\s*<span className="font-mono text-\[9px\] uppercase tracking-widest">Concept<\/span>/, '<div className="w-2 h-2 bg-[#10b981]"/>\n <span className="font-mono text-[9px] uppercase tracking-widest">Concept</span>');
    content = content.replace(/<div className="w-2 h-2 bg"\/>\n\s*<span className="font-mono text-\[9px\] uppercase tracking-widest">Motif<\/span>/, '<div className="w-2 h-2 bg-[#3b82f6]"/>\n <span className="font-mono text-[9px] uppercase tracking-widest">Motif</span>');
    content = content.replace(/<div className="w-2 h-2 bg"\/>\n\s*<span className="font-mono text-\[9px\] uppercase tracking-widest">Era<\/span>/, '<div className="w-2 h-2 bg-[#f59e0b]"/>\n <span className="font-mono text-[9px] uppercase tracking-widest">Era</span>');
    content = content.replace(/<div className=\`w-1\.5 h-1\.5 \$\{Math\.random\(\) > 0\.2 \? 'bg' : 'bg'\}\` \/>/, '<div className={`w-1.5 h-1.5 ${Math.random() > 0.2 ? \'bg-emerald-500\' : \'bg-amber-500\'}`} />');
  }

  // Cleanup any lingering weirdness
  content = content.replace(/dark:bg-nous-base0/g, 'dark:bg-nous-base');
  content = content.replace(/dark:border-nous-base0/g, 'dark:border-nous-base');
  content = content.replace(/dark:text-nous-base0/g, 'dark:text-nous-base');
  fs.writeFileSync(file, content);
});
