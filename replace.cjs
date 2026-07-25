const fs = require('fs');
const file = 'components/InputStudio.tsx';
let content = fs.readFileSync(file, 'utf8');

const submitReplace = `  {/* Submit Button */}
  <div className="fixed bottom-28 right-8 md:right-12 z-50">
    <button onClick={() => setShowConfirmation(true)} className="bg-primary text-nous-base px-6 py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-nous-text transition-colors shadow-lg flex items-center gap-2 border border-nous-border">
      Submit to Issue <ArrowUpRight size={14} />
    </button>
  </div>
  </div>
  </motion.div>`;

content = content.replace(/\{\/\* Submit Button \*\/\}\s*<button onClick=\{\(\) => setShowConfirmation\(true\)\} className="text-\[10px\] uppercase tracking-\[0\.2em\] border-b border-primary\/20 \/20 hover:border-primary dark:hover:border-white transition-colors text-primary text-nous-text mb-4">\s*→ SUBMIT TO ISSUE\s*<\/button>\s*<\/div>\s*<\/motion\.div>/, submitReplace);

fs.writeFileSync(file, content);
