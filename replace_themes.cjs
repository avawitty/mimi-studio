const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const THEMES = \{[\s\S]*?\n\};\n/,
  `const THEMES = {
  'white editorial': { bg: '#FDFBF7', text: '#1C1917', accent: '#78716c', thread: '#E5E7EB', glow: 'transparent', surface: '#FFFFFF', border: '#F5F5F4', font: 'editorial' },
  'white brutalist': { bg: '#FFFFFF', text: '#000000', accent: '#0000FF', thread: '#000000', glow: 'transparent', surface: '#FFFFFF', border: '#000000', font: 'brutalist' },
  'white minimalist': { bg: '#FAFAFA', text: '#333333', accent: '#999999', thread: '#EEEEEE', glow: 'transparent', surface: '#FFFFFF', border: '#EEEEEE', font: 'minimalist' },
  'black editorial': { bg: '#050510', text: '#E0E7FF', accent: '#06B6D4', thread: '#1E1B4B', glow: '0 0 20px rgba(6, 182, 212, 0.8)', surface: '#020617', border: '#0F172A', font: 'editorial' },
  'black brutalist': { bg: '#000000', text: '#00FF00', accent: '#00FF00', thread: '#00FF00', glow: '0 0 20px rgba(0,255,0,0.8)', surface: '#000000', border: '#00FF00', font: 'brutalist' },
  'black minimalist': { bg: '#0A0A0A', text: '#E5E5E5', accent: '#A855F7', thread: '#262626', glow: '0 0 15px rgba(168, 85, 247, 0.4)', surface: '#0A0A0A', border: '#171717', font: 'minimalist' }
};\n`
);

content = content.replace(
  /const handleRotate = \(\) => \{[\s\S]*?window\.dispatchEvent\(new CustomEvent\('mimi:sound', \{ detail: \{ type: 'click' \} \}\)\);\n\s*\};/,
  `const handleRotate = () => {
    const availableThemes = themes.filter(t => t !== activeTheme);
    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    setIsFlipped(!isFlipped);
    onChange(randomTheme);
    window.dispatchEvent(new CustomEvent('mimi:sound', { detail: { type: 'click' } }));
  };`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced THEMES and handleRotate');
