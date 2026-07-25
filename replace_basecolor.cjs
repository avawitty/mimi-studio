const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const baseColor = tailor\?\.chromaticRegistry\?\.baseNeutral \|\| themeConfig\.bg;/,
  `const baseColor = themeConfig.bg;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced baseColor');
