const puppeteer = require('puppeteer');
const UserAgent = require('user-agents');
const xlsx = require('xlsx');
const { chromePath, loopCount, network } = require('./config');

if (!chromePath) {
    console.error("请在account.json中配置chrome路径[chromePath]")
}

//打开浏览器
module.exports = async function openBrowser(windowsize) {
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
    try {
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
        const result = await readFile(browser);
        console.log('result',result);
        await browser.close()
    } catch (error) {
        console.error(error);
        // await browser.close()
    }
}

async function performanceTest(browser, url) {
    console.log(url);
    page = await browser.newPage();

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
    try {
        await page.goto(url);
    } catch (error) {
        console.error('页面打开失败！');
        await page.close();
        return {
            '页面完全加载时间': 0
        }
    }
    const time = JSON.parse(
        await page.evaluate(() => JSON.stringify(performance.timing))
    );
    let timingObj = {}
    // timingObj['页面地址：'] = url;
    timingObj['重定向时间'] = (time.redirectEnd - time.redirectStart) / 1000;
    timingObj['DNS解析时间'] = (time.domainLookupEnd - time.domainLookupStart) / 1000;
    timingObj['TCP完成握手时间'] = (time.connectEnd - time.connectStart) / 1000;
    timingObj['HTTP请求响应完成时间'] = (time.responseEnd - time.requestStart) / 1000;
    timingObj['DOM开始加载前所花费时间'] = (time.responseEnd - time.navigationStart) / 1000;
    timingObj['DOM加载完成时间'] = (time.domComplete - time.domLoading) / 1000;
    timingObj['DOM结构解析完成时间'] = (time.domInteractive - time.domLoading) / 1000;
    timingObj['白屏时间'] = (time.domLoading - time.fetchStart) / 1000;
    timingObj['脚本加载时间'] = (time.domContentLoadedEventEnd - time.domContentLoadedEventStart) / 1000;
    timingObj['onload事件时间'] = (time.loadEventEnd - time.loadEventStart) / 1000;
    timingObj['页面完全加载时间'] = (timingObj['重定向时间'] + timingObj['DNS解析时间'] + timingObj['TCP完成握手时间'] + timingObj['HTTP请求响应完成时间'] + timingObj['DOM结构解析完成时间'] + timingObj['DOM加载完成时间']);
    console.log(timingObj);
    await page.close();
    return timingObj;
}

//可以创建成功
function createFile() {
    var ws = xlsx.utils.aoa_to_sheet(data);
    var wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "SheetJS");
    xlsx.writeFile(wb, 'out.xlsx');
}

// createFile()
//可以读取成功
async function readFile(browser) {
    var workbook = xlsx.readFile('./file/excel/input.xlsx');
    // sheet名
    var first_sheet_name = workbook.SheetNames[0];
    //单元格
    var worksheet = workbook.Sheets[first_sheet_name];
    let xlsx_data = xlsx.utils.sheet_to_json(worksheet);
    let new_xlsx_data = [];//用于过滤一些不要的字段
    // index =2 从第二行开始，第一行是表头
    for (let index = 2; index < xlsx_data.length + 2; index++) {
        var desired_cell = worksheet['A' + index];
        var desired_value = (desired_cell ? desired_cell.v : undefined);
        if (desired_value == undefined) {
            break
        }
        // console.log(loopCount);
        try {
            let url = desired_value;
            let obj = {
                'URL': xlsx_data[index - 2]['URL'],
            }
            for (let index2 = 0; index2 < loopCount; index2++) {
                const result = await performanceTest(browser, url);
                Object.keys(result).forEach(key=>{
                    obj[key]=result[key];
                })
            }
            new_xlsx_data.push(obj)

        } catch (error) {
            console.error(error);
            await browser.close()
        }
    }
    // const xlsx_data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
    const ws = xlsx.utils.json_to_sheet(new_xlsx_data)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws)
    xlsx.writeFile(wb, './file/excel/output.xlsx', {
        compression: false,  // 为true时会压缩文件
        bookSST: true,
        bookType: 'xlsx'
    })

}