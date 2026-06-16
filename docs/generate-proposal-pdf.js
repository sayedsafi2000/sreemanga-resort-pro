const path = require('path');
const fs = require('fs');
const { mdToPdf } = require('md-to-pdf');

async function generateFromHtml() {
  const puppeteer = require('puppeteer');
  const htmlPath = path.join(__dirname, 'CSE-436-RMS-Project-Proposal.html');
  const pdfPath = path.join(__dirname, 'CSE-436-RMS-Project-Proposal.pdf');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, {
    waitUntil: 'networkidle0',
    path: path.join(__dirname),
  });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });
  await browser.close();
  console.log('PDF created:', pdfPath);
}

async function generateFromMd() {
  const mdPath = path.join(__dirname, 'CSE-436-RMS-Project-Proposal.md');
  const pdfPath = path.join(__dirname, 'CSE-436-RMS-Project-Proposal.pdf');
  await mdToPdf(
    { path: mdPath },
    {
      dest: pdfPath,
      basedir: __dirname,
      pdf_options: {
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      },
    }
  );
  console.log('PDF created:', pdfPath);
}

(async () => {
  try {
    await generateFromHtml();
  } catch (err) {
    console.error('HTML PDF failed, trying MD:', err.message);
    await generateFromMd();
  }
})();
