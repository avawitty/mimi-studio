const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/InputStudio.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\<p className="truncate"\>\{mediaAnalysis\[index\]\.tags\.slice\(0, 3\)\.join\(', '\)\}\<\/p\>/g,
  `<p className="truncate mb-1">{mediaAnalysis[index].tags.slice(0, 3).join(', ')}</p>
   {mediaAnalysis[index].aesthetic?.mood && <p className="truncate mb-1">Mood: {mediaAnalysis[index].aesthetic.mood.join(', ')}</p>}
   {mediaAnalysis[index].aesthetic?.culturalReferences && <p className="truncate mb-1">Refs: {mediaAnalysis[index].aesthetic.culturalReferences.slice(0, 2).join(', ')}</p>}`
);

content = content.replace(
  /Inject to Signal/g,
  `Inform Signal`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced inject to signal');
