const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./components');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Remove shadows
  content = content.replace(/\bshadow-(sm|md|lg|xl|2xl|inner|none)\b/g, '');
  content = content.replace(/\bshadow\b/g, '');
  content = content.replace(/shadow-\[[^\]]*\]/g, '');
  content = content.replace(/drop-shadow-\w+/g, '');
  
  // Remove rounded
  content = content.replace(/\brounded-(sm|md|lg|xl|2xl|3xl|full|none)\b/g, 'rounded-none');
  content = content.replace(/\brounded\b/g, 'rounded-none');
  content = content.replace(/rounded-\[[^\]]*\]/g, 'rounded-none');
  content = content.replace(/\brounded-t-(sm|md|lg|xl|2xl|3xl|full|none)\b/g, 'rounded-none');
  content = content.replace(/\brounded-b-(sm|md|lg|xl|2xl|3xl|full|none)\b/g, 'rounded-none');
  content = content.replace(/\brounded-l-(sm|md|lg|xl|2xl|3xl|full|none)\b/g, 'rounded-none');
  content = content.replace(/\brounded-r-(sm|md|lg|xl|2xl|3xl|full|none)\b/g, 'rounded-none');

  // Clean up multiple spaces
  content = content.replace(/ +/g, ' ');
  content = content.replace(/ "/g, '"');
  content = content.replace(/" /g, '"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Total files changed: ${changedFiles}`);
