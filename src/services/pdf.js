const ejs = require('ejs');
const path = require('path');
const { normalize } = require('./invoice');

const viewsDir = path.join(__dirname, '..', 'views');

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    const puppeteer = require('puppeteer');
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

async function renderInvoiceHtml(invoice) {
  const data = normalize(invoice);
  const templateFile = path.join(
    viewsDir,
    'templates',
    `template${data.template}.ejs`
  );
  const body = await ejs.renderFile(templateFile, { invoice: data });
  const layout = await ejs.renderFile(path.join(viewsDir, 'pdf-layout.ejs'), {
    body,
  });
  return layout;
}

async function generatePdf(invoice) {
  const html = await renderInvoiceHtml(invoice);
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });
  await page.close();
  return pdf;
}

module.exports = { generatePdf, renderInvoiceHtml };
