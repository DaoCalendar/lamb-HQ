var http=require('http');
var fs=require('fs');
var iconv=require("iconv-lite");

var EventProxy=require('eventproxy');



var NetStock=require("./models/net/Stock.js");
var settings=require("./Settings.js");
var mongoose=require("./models/db/mongoose.js");


var stockJsonFile=settings.stockJsonFile;
var stockJsonFileString='{"aaData":[';
var ep=new EventProxy();

var updateStock=function(){
        var DbStock=mongoose.model("Stock");
        DbStock.find({},function(err,stocks){
            if(err)
            {
                return console.log(err.message);
            }


            var sLength=100;
            var i_hund=parseInt(stocks.length/sLength);
            var i_rest=stocks.length%sLength;


            ep.after('got_stock',i_rest==0?i_hund:i_hund+1,function(stockJsonList){
                var length=stockJsonList.length;
                for(var i=0;i<length;++i)
                {
                   stockJsonFileString+=stockJsonList[i];
                }
                stockJsonFileString=stockJsonFileString.substr(0,stockJsonFileString.length-1);
                stockJsonFileString+=']}';
                fs.writeFile(stockJsonFile,stockJsonFileString,function(err){
                    if(err)
                    {
                        console.log(err.message);
                    }
                });

            });
            var stockDataPath=settings.stockDataHostPathPart;
            var stockArray=[];

             for(var i=0;i<i_hund+1;++i)
             {
                        if(i<i_hund)
                        {
                          var jLength=(i+1)*sLength;
                          for(var j=i*sLength;j<jLength;++j)
                          {

                              var newStock=new NetStock(stocks[j].number,stocks[j].pinyin,stocks[j].cname);
                              stockArray.push(newStock);
                              //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                              stockDataPath+=newStock.num_prefix_+newStock.number_+",";
                          }
                          AppendStockJsonFileString(stockDataPath,stockArray);
                          //重置循环
                          stockDataPath=settings.stockDataHostPathPart;
                          stockArray=[];
                        }else
                        {
                            if(i_rest!=0)
                            {
                                for(var j=i_hund*sLength;j<i_hund*sLength+i_rest;++j)
                                {
                                    var newStock=new NetStock(stocks[j].number,stocks[j].pinyin,stocks[j].cname);
                                    stockArray.push(newStock);
                                    //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                                    stockDataPath+=newStock.num_prefix_+newStock.number_+",";
                                }
                                AppendStockJsonFileString(stockDataPath,stockArray);
                            }
                        }
             }

        });

};

function AppendStockJsonFileString(stockDataPath,stockArray){
    var  stock_data;
    var options={host:settings.stockDataHost,path:stockDataPath};
    var stockDataReq= http.get(options,function(stockDataRes){
        console.log("Status:"+stockDataRes.statusCode);
        stockDataRes.setEncoding("binary");
        stockDataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stock_data+=data;
            console.log(data);
        });

        //100个股票数据拿到
        stockDataRes.on('end',function(){
            var buf=new Buffer(stock_data,'binary');
            var stock_data_=iconv.decode(buf,'GBK');


            var stockDataArray=stock_data_.split(";");
            //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
            for(var k=0;k<stockArray.length;++k)
            {
                stockArray[k].SliceAssignStockData(stockDataArray[k]);
            }
            //全部数据拿到
            var stockArrayString100="";
            for(var k=0;k<stockArray.length;++k){
                if(stockArray[k].now_price_==undefined)
                {
                    //中止上市的股票（什么都获取不到）
                    var stockArrayString='['+

                        '"'+stockArray[k].number_+'",'+
                        //ajax刷新的时候,不用更新代码和名称，但要传送number做前端识别
                        '"'+stockArray[k].cname_+'",'+
                        '"'+stockArray[k].pinyin_+'",'+
                        '"0.00%",'+
                        '"--",'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        //成交量/手除100
                        '0.00,'+
                        //成交额/万要除10000
                        '0.00,'+
                        '0.00,'+
                        '"--",'+
                        '0.00,'+
                        '0.00'+
                        ']';
                }
                else if(stockArray[k].today_first_price_==0.00)
                {
                    //停牌的股票（名字和现价，其他都为0
                    var stockArrayString='['+

                        '"'+stockArray[k].number_+'",'+
                        //ajax刷新的时候,不用更新代码和名称，但要传送number做前端识别
                        '"'+stockArray[k].cname_+'",'+
                        '"'+stockArray[k].pinyin_+'",'+
                        '"0.00%",'+
                        '"--",'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        //成交量/手除100
                        '0.00,'+
                        //成交额/万要除10000
                        '0.00,'+
                        '0.00,'+
                        stockArray[k].yday_end_price_+','+
                        '0.00,'+
                        '0.00'+
                        ']';
                }else{

                    var stockArrayString='['+
                        '"'+stockArray[k].number_+'",'+
                        '"'+stockArray[k].cname_+'",'+
                        '"'+stockArray[k].pinyin_+'",'+
                        '"'+((stockArray[k].now_price_-stockArray[k].yday_end_price_)/stockArray[k].yday_end_price_*100).toFixed(2)+'%",'+
                        stockArray[k].now_price_+','+
                        (stockArray[k].now_price_-stockArray[k].yday_end_price_).toFixed(2)+','+
                        stockArray[k].buy_price_+','+
                        stockArray[k].sole_price_+','+
                        (stockArray[k].bargain_amount_/100).toFixed(2)+','+
                        (stockArray[k].bargain_value_/10000).toFixed(2)+','+
                        stockArray[k].today_first_price_+','+
                        stockArray[k].yday_end_price_+','+
                        stockArray[k].today_hightest_price_+','+
                        stockArray[k].today_lowest_price_+
                        ']';
                }


                stockArrayString100+=stockArrayString+',';

            }
            ep.emit('got_stock',stockArrayString100);
            //console.log("accepted all data:",stock_data_);
        });

        //100个股票请求结束
        stockDataReq.on("error",function(err){
            console.log(err.message);
        });
    });

};

module.exports=updateStock;

