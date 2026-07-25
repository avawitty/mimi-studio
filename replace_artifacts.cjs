const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

let count = 0;
content = content.replace(
  /artifacts=\{metadata\.artifacts\}/g,
  (match) => {
    count++;
    if (count === 1) {
      return `artifacts={metadata.artifacts}`;
    } else {
      return `artifacts={metadata.artifacts?.length > 1 ? metadata.artifacts : undefined}`;
    }
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced artifacts passing');
