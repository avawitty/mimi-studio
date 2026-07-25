const fs = require('fs');
const file = 'components/InputStudio.tsx';
let content = fs.readFileSync(file, 'utf8');

const imageReplace = `                  className="mt-1 text-[7px] uppercase tracking-widest text-red-500 underline"
                  >
                  Refract
                  </button>
                  <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const analysis = mediaAnalysis[index];
                    const text = \`[ARTIFACT ANALYSIS: \${analysis.tags.join(', ')}. MOOD: \${analysis.aesthetic?.mood?.join(', ')}]\`;
                    setInput(prev => prev ? \`\${prev}\\n\\n\${text}\` : text);
                  }}
                  className="mt-1 ml-2 text-[7px] uppercase tracking-widest text-primary text-nous-text underline"
                  >
                  Inject to Signal
                  </button>`;

content = content.replace(/className="mt-1 text-\[7px\] uppercase tracking-widest text-red-500 underline"\s*>\s*Refract\s*<\/button>/, imageReplace);

const audioReplace = `                  <p className="truncate">Mood: {mediaAnalysis[index].aesthetic.mood[0]}</p>
                  <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const analysis = mediaAnalysis[index];
                    const text = \`[AUDIO ANALYSIS: \${analysis.tags.join(', ')}. MOOD: \${analysis.aesthetic?.mood?.join(', ')}]\`;
                    setInput(prev => prev ? \`\${prev}\\n\\n\${text}\` : text);
                  }}
                  className="mt-1 text-[7px] uppercase tracking-widest text-primary text-nous-text underline"
                  >
                  Inject to Signal
                  </button>`;

content = content.replace(/<p className="truncate">Mood: \{mediaAnalysis\[index\]\.aesthetic\.mood\[0\]\}<\/p>/, audioReplace);

fs.writeFileSync(file, content);
