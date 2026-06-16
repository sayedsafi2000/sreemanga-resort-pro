const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function generatePdf() {
  const docsDir = __dirname;
  const htmlPath = path.join(docsDir, 'CSE-436-RMS-Project-Proposal.html');
  const pdfPath = path.join(docsDir, 'CSE-436-RMS-Project-Proposal.pdf');
  const desktopPdf = '/Users/safi/Desktop/CSE 436 (RMS) Project Proposal.pdf';

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'load',
    timeout: 15000,
  });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '2.54cm',
      right: '2.54cm',
      bottom: '2.54cm',
      left: '2.54cm',
    },
  });

  await browser.close();
  fs.copyFileSync(pdfPath, desktopPdf);
  console.log('PDF created:', pdfPath);
  console.log('Copied to:', desktopPdf);
}

generatePdf().catch((err) => {
  console.error(err);
  process.exit(1);
});
