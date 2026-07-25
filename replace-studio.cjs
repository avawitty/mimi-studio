const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'StrategyStudio.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/bg-white/g, 'bg-transparent');
content = content.replace(/bg-black/g, 'bg-nous-text');
content = content.replace(/text-white/g, 'text-nous-base');
content = content.replace(/text-black/g, 'text-nous-text');

fs.writeFileSync(filePath, content);
console.log('Done');
