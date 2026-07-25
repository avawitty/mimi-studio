const fs = require('fs');
let c = fs.readFileSync('components/TailorView.tsx', 'utf8');

c = c.replace(
  "useUser } from '../contexts/UserContext';",
  "useUser } from '../contexts/UserContext';\nimport { AestheticTokensMap } from './AestheticTokensMap';"
);

c = c.replace(/\| 'voice' \| 'vectors'/g, "| 'voice' | 'tokens' | 'vectors'");
c = c.replace(/'voice', 'vectors'/g, "'voice', 'tokens', 'vectors'");

c = c.replace(
  "{activeStep === 'shards' && (",
  "{activeStep === 'tokens' && (\n  <div className=\"h-[700px] border hidden md:block border-nous-border relative\">\n    <AestheticTokensMap />\n  </div>\n)}\n\n{activeStep === 'shards' && ("
);

fs.writeFileSync('components/TailorView.tsx', c);
