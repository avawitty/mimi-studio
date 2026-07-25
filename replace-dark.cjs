const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const appFile = path.join(__dirname, 'App.tsx');

const filesToProcess = [appFile];

if (fs.existsSync(componentsDir)) {
  const componentFiles = fs.readdirSync(componentsDir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join(componentsDir, f));
  filesToProcess.push(...componentFiles);
}

const replacements = [
  // Remove all dark: variants for colors that are now theme-aware
  { regex: /dark:bg-nous-base/g, replace: '' },
  { regex: /dark:text-nous-text/g, replace: '' },
  { regex: /dark:text-nous-subtle/g, replace: '' },
  { regex: /dark:border-nous-border/g, replace: '' },
  { regex: /dark:hover:bg-nous-base/g, replace: '' },
  { regex: /dark:hover:text-nous-text/g, replace: '' },
  { regex: /dark:hover:text-nous-subtle/g, replace: '' },
  { regex: /dark:hover:border-nous-border/g, replace: '' },
  
  // Replace specific hardcoded white/black patterns
  { regex: /bg-white dark:bg-black/g, replace: 'bg-nous-base' },
  { regex: /bg-black dark:bg-white/g, replace: 'bg-nous-text' },
  { regex: /text-black dark:text-white/g, replace: 'text-nous-text' },
  { regex: /text-white dark:text-black/g, replace: 'text-nous-base' },
  
  { regex: /bg-nous-text dark:bg-white/g, replace: 'bg-nous-text' },
  { regex: /text-white dark:text-nous-text/g, replace: 'text-nous-base' },
  { regex: /bg-white dark:bg-nous-base/g, replace: 'bg-nous-base' },
  { regex: /bg-white dark:bg/g, replace: 'bg-nous-base' },
  
  // Cleanup double spaces
  { regex: /  +/g, replace: ' ' },
  { regex: / "/g, replace: '"' },
  { regex: /" /g, replace: '"' },
];

for (const filePath of filesToProcess) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const { regex, replace } of replacements) {
    content = content.replace(regex, replace);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${path.basename(filePath)}`);
  }
}
console.log('Done');
