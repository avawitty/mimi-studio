const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const \[activeTheme, setActiveTheme\] = useState\<'organic' \| 'synthetic' \| 'latent'\>\([\s\S]*?\);/,
  `const [activeTheme, setActiveTheme] = useState<string>('white editorial');`
);

content = content.replace(
  /const themeConfig = THEMES\[activeTheme as keyof typeof THEMES\] \|\| THEMES\['organic'\];/,
  `const themeConfig = THEMES[activeTheme as keyof typeof THEMES] || THEMES['white editorial'];`
);

content = content.replace(
  /const accentColor = activeTheme === 'synthetic' \? themeConfig\.accent : \(tailor\?\.chromaticRegistry\?\.accentSignal \|\| themeConfig\.accent\);/,
  `const accentColor = tailor?.chromaticRegistry?.accentSignal || themeConfig.accent;`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced activeTheme');
