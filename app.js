var http = require("http");
var express = require("express");
const path = require('path');
var xlsx = require('node-xlsx');
var mutiparty = require('multiparty')
var fs = require('fs')
var SimpleLinearRegression = require('ml-regression-simple-linear');
const {
  lstat
} = require("fs");


var app = express();
var dstPath

//设置跨域
app.all("*", function (req, res, next) {
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin", "*");
  //允许的header类型
  res.header("Access-Control-Allow-Headers", "content-type");
  //跨域允许的请求方式 
  res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
  if (req.method.toLowerCase() == 'options')
    res.send(200); //让options尝试请求快速结束
  else
    next();
})

//
app.post('/upload', function (req, res) {
  var form = new mutiparty.Form({
    uploadDir: './upload'
  })
  form.parse(req)
  //监听上传文件
  form.on('file', (name, files, ...rest) => {
    // console.log(files)
    var inputFile = files;
    var uploadedPath = inputFile.path;
    dstPath = './upload/' + inputFile.originalFilename;
    //文件重命名
    fs.rename(uploadedPath, dstPath, function (err) {
      if (err) {
        console.log('rename error: ' + err);
      } else {
        console.log('rename ok');
      }
    })
  })
  // 表单数据解析完成，触发close事件
  form.on('close', () => {
    // console.log('表单数据解析完成')
    var sheets = xlsx.parse(dstPath);
    var arr = [];
    // sheets是一个数组，数组中的每一项对应test.xlsx这个文件里的多个表格，如sheets[0]对应test.xlsx里的“测试参数”这个表格，sheets[1]对应Sheet2这个表格
    var test = []
    var test1 = []
    var data = []
    var LST = []
    var IBI = []
    var NDVI = []
    sheets[0]["data"].forEach(function (item, index) {
      if (index) {
        LST.push(item[1])
        IBI.push(item[2])
        NDVI.push(item[3])
        test.push([item[2], item[3]])
        data.push({
          "LST": item[1],
          "IBI": item[2],
          "NDVI": item[3]
        })
      }
    })

    const regression = new SimpleLinearRegression(IBI, NDVI);
    const a1 = regression.slope
    const b1 = regression.intercept
    const r1 = regression.score(IBI, NDVI)

    var newIBI = []
    var newLST = []
    data.forEach(function (item, index) {
      if (item.NDVI >= -0.0002 && item.NDVI <= 0.0002) {
        test1.push([item.IBI, item.LST])
        newIBI.push(item.IBI)
        newLST.push(item.LST)
      }
    })
    const newregression = new SimpleLinearRegression(newIBI, newLST);
    const a2 = newregression.slope
    const b2 = newregression.intercept
    const r2 = newregression.score(newIBI, newLST)

    const IBIimitate = []
    var AveLST = 0,
      AveNDVI = 0,
      AveIBIimitate = 0
    NDVI.forEach(function (item, index) {
      IBIimitate.push((0 - item) / a1 + IBI[index])
    })

    LST.forEach(function (item) {
      AveLST += item / LST.length
    })
    NDVI.forEach(function (item) {
      AveNDVI += item / NDVI.length
    })
    IBIimitate.forEach(function (item) {
      AveIBIimitate += item / IBIimitate.length
    })

    const AveLSTimitate = a2 * AveIBIimitate + b2

    const TEMPimitate = (AveLSTimitate - AveLST) * 18
    var all = {
      'IBINDVI': test,
      'IBILST': test1,
      '参数': {
        "a1": a1,
        "b1": b1,
        "r1": r1.r2,
        "a2": a2,
        "b2": b2,
        "r2": r2.r2,
        "NDVI平均值": AveNDVI,
        "模拟温度": TEMPimitate
      }
    }
    res.send(all)
  })
})

app.use(express.static(path.join(__dirname, '')));

app.listen(5010, () => {
  console.log(`Connect to http://localhost:5010/`)
})