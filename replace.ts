import * as fs from 'fs';
const file = 'components/TheGEOEngine.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/setGeoPack/g, 'setActivePack');
fs.writeFileSync(file, data);
console.log('Replaced setGeoPack successfully');
