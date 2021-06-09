const express = require('express');
const ejs = require('ejs');
const path = require('path');
const urlToExcel = require('./urlToExcel');
const excelToExcel = require('./excelToExcel');
const pageToPdf = require('./pageToPdf');
const app = express();
const port = 3006;

// view engine setup环境变量设置
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 首页 输入测试url
app.get('/', (req, res) => {
    res.render('index', {
        name: 'hello'
    })
})

// 结果页显示测试数据表
app.post('/result',async (req, res) => {
    let testPages = req.body;
    // const resultObj = await urlToExcel(args.url)
    testPages = JSON.stringify(testPages) 
    testPages = encodeURI(testPages)
    res.render('result', {
      name: 'result',
      testPages: testPages
    })
})

// 测试页面接口
app.post('/test', async (req, res) => {
  const args = req.body;
  console.log('5555',args);
  
  const resultObj = await urlToExcel(args.url)
  console.log('result12', resultObj);
  
  res.status(200).send({code: 0, message:'测试完成', data: resultObj})
})


app.get('/pdf', (req, res) => {
    const url = req.query;
    res.sendFile('/data/RemoteWorking/huopan/performance/pdfs/hn.pdf')
})

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
})