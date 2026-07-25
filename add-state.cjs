const fs = require('fs');
let content = fs.readFileSync('components/ThimbleDashboard.tsx', 'utf8');
content = content.replace(
  'const [expandedTargetIndex, setExpandedTargetIndex] = useState<number | null>(null);',
  'const [expandedTargetIndex, setExpandedTargetIndex] = useState<number | null>(null);\n  const [selectedBoardIdForTarget, setSelectedBoardIdForTarget] = useState<string>(\'\');'
);
fs.writeFileSync('components/ThimbleDashboard.tsx', content);
