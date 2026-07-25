import * as fs from 'fs';
let content = fs.readFileSync('components/ExportChamber.tsx', 'utf8');

const regexImport = /import \{ jsPDF \} from 'jspdf';/;
content = content.replace(regexImport, "import { jsPDF } from 'jspdf';\nimport JSZip from 'jszip';");

const regexGeneratePDF = /const generatePDF = async \(\) => \{/;
content = content.replace(regexGeneratePDF, `
  const urlToBase64 = async (url: string) => {
      if (url.startsWith('data:')) return url.split(',')[1];
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const generateAssetsZip = async () => {
    try {
      const zip = new JSZip();
      let imgCount = 0;
      
      if (metadata.coverImageUrl) {
          const b64 = await urlToBase64(metadata.coverImageUrl);
          zip.file('hero_image.jpg', b64, {base64: true});
          imgCount++;
      }
      
      const hypothesisImg = (metadata.content as any).hypothesis_image_url;
      if (hypothesisImg) {
          const b64 = await urlToBase64(hypothesisImg);
          zip.file('strategic_hypothesis.jpg', b64, {base64: true});
          imgCount++;
      }
      
      if (metadata.content.pages) {
          for (let i = 0; i < metadata.content.pages.length; i++) {
              if (metadata.content.pages[i].image_url) {
                  const b64 = await urlToBase64(metadata.content.pages[i].image_url);
                  zip.file('visual_plate_0' + (i+1) + '.jpg', b64, {base64: true});
                  imgCount++;
              }
          }
      }
      
      if (imgCount === 0) throw new Error("No visual assets found.");
      
      const zipBlob = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = "Mimi_" + metadata.title.replace(/[^a-z0-9]/gi, '_') + "_Assets.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      console.error(e);
      throw e;
    }
  };

  const generatePDF = async () => {
`);

const regexHandleExport = /if \(exportMode === 'pdf' \|\| exportMode === 'assets'\) \{\s*await generatePDF\(\);\s*\}/;
content = content.replace(regexHandleExport, `if (exportMode === 'pdf') {
        await generatePDF();
    } else if (exportMode === 'assets') {
        await generateAssetsZip();
    }`);

const regexBlockClass = /if \(exportMode === 'pdf' || exportMode === 'assets'\)/g;
content = content.replace(regexBlockClass, "if (exportMode === 'pdf')");

fs.writeFileSync('components/ExportChamber.tsx', content);
