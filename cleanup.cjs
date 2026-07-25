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
  
  // Clean up the mess from the previous script
  content = content.replace(/rounded-none-none/g, 'rounded-none');
  content = content.replace(/rounded-none-[a-z0-9-]+/g, 'rounded-none');
  content = content.replace(/rounded-none\[[^\]]*\]/g, 'rounded-none');
  
  // Remove shadows again just in case there are weird ones
  content = content.replace(/-\[0_.*?\]/g, ''); // removes custom shadows like -[0_50px_100px_rgba(...)] which were left behind when 'shadow' was stripped from 'shadow-[0_...]'
  
  // Clean up multiple spaces
  content = content.replace(/ +/g, ' ');
  content = content.replace(/ "/g, '"');
  content = content.replace(/" /g, '"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Cleaned ${file}`);
  }
});

console.log(`Total files cleaned: ${changedFiles}`);
