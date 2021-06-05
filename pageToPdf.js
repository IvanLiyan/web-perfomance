const puppeteer = require('puppeteer');

module.exports = (url) => {
  let option = {
    ignoreHTTPSErrors: true,
    headless: true,
    pipe: true
  }

  puppeteer.launch(option).then(async browser => {
    const page = await browser.newPage();
    await page.pdf({ path: './file/pdf/page.pdf', printBackground: true });
    await browser.close();
  }).catch(err => {
    console.log('err',err);
  })
};