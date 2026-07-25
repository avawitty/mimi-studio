const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/AnalysisDisplay.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const \[activeTheme, setActiveTheme\] = useState\<string\>\('white editorial'\);/,
  `const [activeTheme, setActiveTheme] = useState<string>('white editorial');
  
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setActiveTheme('black editorial');
    }
  }, []);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added dark mode check');
