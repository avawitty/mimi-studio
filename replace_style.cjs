const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\<style\>\{\`[\s\S]*?\`\}\<\/style\>/,
  `<style>{\`
  .zine-theme-root section { background-color: transparent !important; }
  .zine-theme-root .bg-white, .zine-theme-root .dark\\\\:bg-\\\\[\\\\#0A0A0A\\\\], .zine-theme-root .dark\\\\:bg-nous-base { background-color: var(--zine-surface) !important; }
  .zine-theme-root .border-nous-border, .zine-theme-root .dark\\\\:border-nous-border, .zine-theme-root .dark\\\\:border-nous-border { border-color: var(--zine-border) !important; }
  .zine-theme-root .text-nous-text, .zine-theme-root .dark\\\\:text-nous-text, .zine-theme-root .text-nous-text { color: var(--zine-text) !important; }
  .zine-theme-root .bg-\\\\[\\\\#FDFBF7\\\\], .zine-theme-root .dark\\\\:bg-\\\\[\\\\#080808\\\\], .zine-theme-root .bg-\\\\[\\\\#FAFAFA\\\\] { background-color: var(--zine-bg) !important; }
  \${themeConfig.font === 'editorial' ? \`
    .zine-theme-root .font-serif { font-family: '\${fontFamily}', serif !important; }
  \` : themeConfig.font === 'brutalist' ? \`
    .zine-theme-root .font-serif, .zine-theme-root .font-sans, .zine-theme-root p, .zine-theme-root h1, .zine-theme-root h2, .zine-theme-root h3, .zine-theme-root h4, .zine-theme-root span { font-family: 'JetBrains Mono', monospace !important; text-transform: uppercase !important; letter-spacing: -0.05em !important; }
  \` : \`
    .zine-theme-root .font-serif, .zine-theme-root .font-sans, .zine-theme-root p, .zine-theme-root h1, .zine-theme-root h2, .zine-theme-root h3, .zine-theme-root h4, .zine-theme-root span { font-family: 'Inter', sans-serif !important; font-style: normal !important; letter-spacing: -0.02em !important; }
  \`}
  \`}</style>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced style');
