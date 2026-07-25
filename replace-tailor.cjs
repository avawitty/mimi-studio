const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'TailorView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/bg-white\/50 \/50/g, 'bg-nous-base/50');
content = content.replace(/bg-white/g, 'bg-nous-base');

fs.writeFileSync(filePath, content);
console.log('Done');
