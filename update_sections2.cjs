const fs = require('fs');
let c = fs.readFileSync('components/AnalysisDisplay.tsx', 'utf8');
c = c.replace(/filter: \\'blur/g, "filter: 'blur");
c = c.replace(/ease: \\'easeOut/g, "ease: 'easeOut");
c = c.replace(/margin: \\'-10%/g, "margin: '-10%");
fs.writeFileSync('components/AnalysisDisplay.tsx', c);
