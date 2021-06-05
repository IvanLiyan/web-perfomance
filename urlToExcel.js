const puppeteer = require('puppeteer');
const UserAgent = require('user-agents');
const xlsx = require('xlsx');
const { chromePath, loopCount, network } = require('./config');

if (!chromePath) {
  console.error("请在account.json中配置chrome路径[chromePath]")
}

//打开浏览器
module.exports = async function openBrowser(url) {
  try {
    let args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--window-size=500,1080',
      '--enabled=false',
      '--window-position=1260,0'
    ];
    let browser
    args.push(`--user-agent=${new UserAgent({
      deviceCategory: 'mobile'
    }).toString()}`)

    const options = {
      args,
      // executablePath: chromePath,
      defaultViewport: null,
      headless: true,//设置无头打开官网报错Error: net::ERR_UNEXPECTED
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      devtools: false,
      pipe: true
    };

    browser = await puppeteer.launch(options);
    let urlArr = []

    if(typeof url == 'string'){
      urlArr.push(url)
    } else if(typeof url == 'object' && url instanceof Array) {
      urlArr = url
    }
    const result = await toTestPage(browser, urlArr);
    await browser.close()
    return result
  } catch (error) {
    console.error(error);
    // await browser.close()
  }
}

async function performanceTest(browser, url) {
  try {
    page = await browser.newPage();
    console.log(url);
    // 模拟3g网络
    let cdp = await page.target().createCDPSession();
    await cdp.send('Network.emulateNetworkConditions', {
      'offline': false,
      'downloadThroughput': network.downloadThroughput,//(bytes/sec) 3G最高600K/s 4G 最高10M/s
      'uploadThroughput': network.uploadThroughput,//(bytes/sec)
      'latency': network.latency
    });
    // 禁用浏览器缓存
    await page.setCacheEnabled(false);
    await page.goto(url, {timeout: 10000});
  } catch (error) {
    console.error('页面打开失败！', error);
    // await page.close();
    return {
      pageUrl: url,
      padgeLoaded: '加载超时'
    }
  }
  const time = JSON.parse(
    await page.evaluate(() => JSON.stringify(performance.timing))
  );
  let timingObj = {}
  // 页面地址
  timingObj['pageUrl'] = url;
  //重定向时间
  timingObj['redirectEnd'] = (time.redirectEnd - time.redirectStart) / 1000
  // DNS解析时间
  timingObj['domainLookupEnd'] = (time.domainLookupEnd - time.domainLookupStart) / 1000
  // TCP完成握手时间
  timingObj['connectEnd'] = (time.connectEnd - time.connectStart) / 1000
  // HTTP请求响应完成时间
  timingObj['responseEnd'] = (time.responseEnd - time.requestStart) / 1000
  // DOM开始加载前所花费时间
  timingObj['navigationStart'] = (time.responseEnd - time.navigationStart) / 1000
  // DOM加载完成时间
  timingObj['domComplete'] = (time.domComplete - time.domLoading) / 1000
  // DOM结构解析完成时间
  timingObj['domInteractive'] = (time.domInteractive - time.domLoading) / 1000
  // 白屏时间
  timingObj['domLoading'] = (time.domLoading - time.fetchStart) / 1000
  // 脚本加载时间
  timingObj['domContentLoadedEventEnd'] = (time.domContentLoadedEventEnd - time.domContentLoadedEventStart) / 1000
  // onload事件时间
  timingObj['loadEventEnd'] = (time.loadEventEnd - time.loadEventStart) / 1000

  let padgeLoaded = ((time.redirectEnd - time.redirectStart) / 1000 + (time.domainLookupEnd - time.domainLookupStart) / 1000 + (time.connectEnd - time.connectStart) / 1000 + (time.responseEnd - time.requestStart) / 1000 + (time.domComplete - time.domLoading) / 1000 + (time.domInteractive - time.domLoading) / 1000).toFixed(3)
  // 页面完全加载时间
  timingObj['padgeLoaded'] = padgeLoaded

  if(0.5 >= padgeLoaded) {
    timingObj['pageLevel'] = 'S'
  } else if(0.8 >= padgeLoaded > 0.5) {
    timingObj['pageLevel'] = 'A'
  } else if(1 >= padgeLoaded > 0.8) {
    timingObj['pageLevel'] = 'B'
  } else if( padgeLoaded > 1) {
    timingObj['pageLevel'] = 'C'
  }

  await page.close();
  return timingObj;
}

async function toTestPage(browser, urlArr) {
  let testResultArr = []
  try {
    for (let i = 0; i < urlArr.length; i++) {
      let result = await performanceTest(browser, urlArr[i])
      testResultArr.push(result)
    }
    return testResultArr
  } catch (error) {
    console.log('error', error);
  }
}