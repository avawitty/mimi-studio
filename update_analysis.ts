import * as fs from 'fs';
let content = fs.readFileSync('components/AnalysisDisplay.tsx', 'utf8');

content = content.replace(
  /initialImage=\{\(metadata\.content as any\)\.hypothesis_image_url\}\s+onImageGenerated=\{handleHypothesisImageGenerated\}/,
  'initialImage={(metadata.content as any).hypothesis_image_url}\n                autoDevelop={false}\n                onImageGenerated={handleHypothesisImageGenerated}'
);

content = content.replace(
  /treatmentId=\{metadata\.treatmentId\}\s+onImageGenerated=\{\(base64\) => handlePageImageGenerated\(base64, i\)\}/,
  'treatmentId={metadata.treatmentId}\n                autoDevelop={false}\n                onImageGenerated={(base64) => handlePageImageGenerated(base64, i)}'
);

fs.writeFileSync('components/AnalysisDisplay.tsx', content);
