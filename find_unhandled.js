const fs = require('fs');
const path = require('path');

function findUnhandledPromises(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        findUnhandledPromises(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('.then(') && !lines[i].includes('.catch(')) {
          // Check if .catch is on the next few lines
          let hasCatch = false;
          for (let j = i; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].includes('.catch(')) {
              hasCatch = true;
              break;
            }
          }
          if (!hasCatch) {
            console.log(`${fullPath}:${i + 1}: ${lines[i].trim()}`);
          }
        }
      }
    }
  }
}

findUnhandledPromises('.');
