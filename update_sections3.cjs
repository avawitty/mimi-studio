const fs = require('fs');
let c = fs.readFileSync('components/AnalysisDisplay.tsx', 'utf8');
c = c.replace(/\\'/g, "'");
fs.writeFileSync('components/AnalysisDisplay.tsx', c);
