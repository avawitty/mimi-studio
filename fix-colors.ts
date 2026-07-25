import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walk(dirPath, callback);
    else callback(dirPath);
  });
}

walk('./components', (file) => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // fix bg/ -> bg-nous-text/ dark:bg-nous-base/ (or bg-stone-900 / dark:bg-stone-100)
  // And fix bare "bg" and "text" without anything else? Wait, "bg " or "text " might exist but the original file had `text ` sometimes.
  content = content.replace(/(?<![a-zA-Z0-9_-])bg\/((?:\[[%\.\d]+\]|\d+))/g, 'bg-nous-text/$1 dark:bg-nous-base/$1');
  content = content.replace(/(?<![a-zA-Z0-9_-])border\/((?:\[[%\.\d]+\]|\d+))/g, 'border-nous-text/$1 dark:border-nous-base/$1');
  content = content.replace(/(?<![a-zA-Z0-9_-])text\/((?:\[[%\.\d]+\]|\d+))/g, 'text-nous-text/$1 dark:text-nous-base/$1');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Fixed colors in ${file}`);
  }
});
