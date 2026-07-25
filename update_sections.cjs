const fs = require('fs');
let c = fs.readFileSync('components/AnalysisDisplay.tsx', 'utf8');
c = c.replace(/<section className=\"min-h-\[100dvh\]/g, '<motion.section initial={{ opacity: 0, y: 50, filter: \\\'blur(10px)\\\' }} whileInView={{ opacity: 1, y: 0, filter: \\\'blur(0px)\\\' }} viewport={{ once: true, margin: \\\'-10%\\\' }} transition={{ duration: 1, ease: \\\'easeOut\\\' }} className=\"min-h-[100dvh]');
c = c.replace(/<\/section>/g, '</motion.section>');
fs.writeFileSync('components/AnalysisDisplay.tsx', c);
