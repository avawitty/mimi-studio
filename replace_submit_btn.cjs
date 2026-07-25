const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/InputStudio.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /className="fixed bottom-28 right-8 md:right-12 z-50"/,
  `className="fixed top-8 right-8 md:top-12 md:right-12 z-50"`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced submit button position');
