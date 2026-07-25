const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/text-nous-text0/g, 'text-nous-subtle');
content = content.replace(/bg-primary dark:bg-black/g, 'bg-nous-text');
content = content.replace(/border-canvas-border dark:border-white/g, 'border-nous-border');

fs.writeFileSync(filePath, content);
console.log('Done');
