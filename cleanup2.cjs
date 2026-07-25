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
  
  // Clean up rounded-none-[...] and similar
  content = content.replace(/rounded-none-\[[^\]]*\]/g, 'rounded-none');
  content = content.replace(/rounded-none-[a-z0-9-]+/g, 'rounded-none');
  
  // Clean up leftover shadow brackets like -[inset_...] or -[0_...]
  content = content.replace(/-\[inset_[^\]]*\]/g, '');
  content = content.replace(/-\[[0-9]+px_[^\]]*\]/g, '');
  content = content.replace(/-\[[^\]]*rgba?[^\]]*\]/g, '');
  content = content.replace(/-\[[^\]]*#([0-9a-fA-F]{3,8})[^\]]*\]/g, '');
  
  // Clean up multiple spaces
  content = content.replace(/ +/g, ' ');
  content = content.replace(/ "/g, '"');
  content = content.replace(/" /g, '"');
  
  // Clean up empty classNames
  content = content.replace(/className=""/g, '');
  content = content.replace(/className=" "/g, '');
  
  // Clean up trailing spaces in className
  content = content.replace(/className="([^"]*) "/g, 'className="$1"');
  content = content.replace(/className=" ([^"]*)"/g, 'className="$1"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Cleaned ${file}`);
  }
});

console.log(`Total files cleaned: ${changedFiles}`);
