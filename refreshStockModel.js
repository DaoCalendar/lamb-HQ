var http=require('http');
var iconv=require("iconv-lite");
var EventProxy=require('eventproxy');

var mongoose=require("./models/db/mongoose.js");
var settings=require("./Settings.js");
var NetStock=require("./models/net/Stock.js");

var ep=new EventProxy();
//http.globalAgent.maxSockets = 1024;
var refreshStockModel=function(){
    var nowDate=new Date();
    var morBegDate=new Date();
    morBegDate.setHours(9,15,0);
    var morEndDate=new Date();
    morEndDate.setHours(11,31,0);
    var noonBegDate=new Date();
    noonBegDate.setHours(12,59,0);
    var noonEndDate=new Date();
    noonEndDate.setHours(15,1,0);
    //在9:15-11：30,1:00-3:00才去刷新
    if(1/*nowDate>=morBegDate&&nowDate<=morEndDate||nowDate>=noonBegDate&&nowDate<=noonEndDate*/)
    {
        var DbStock=mongoose.model("Stock");
        //获得所有股票数据
        DbStock.find({},function(err,stocks){
            if(err)
            {
                return console.log("Find_All_DbStock_Error Detail:"+err.message);
            }


            var sLength=100;
            var i_hund=parseInt(stocks.length/sLength);
            var i_rest=stocks.length%sLength;

            //获得网络上所有股票最新数据
            ep.after('got_stock100',i_rest==0?i_hund:i_hund+1,function(stock100ArrayList){
                stock100ArrayList.forEach(function(stock100Array){
                     stock100Array.forEach(function(stock){
                           DbStock.update({number:stock.number_},{
                               riseRate:stock.rise_rate_,
                               nowPrice:stock.now_price_,
                               riseValue:stock.rise_value_,
                               buyPrice:stock.buy_price_,
                               solePrice:stock.sole_price_,
                               bargainAmount:stock.bargain_amount_,
                               bargainValue:stock.bargain_value_,
                               todayFirstPrice:stock.today_first_price_,
                               ydayEndPrice:stock.yday_end_price_,
                               todayHightestPrice:stock.today_hightest_price_,
                               todayLowesetPrice:stock.today_lowest_price_
                           },function(err,numberAffected,rawResponse){
                               if(err)
                               {
                                   return console.log("Update_Stock_Error Number is:"+stock.number_);
                               }
                           });
                     });
                });



            });

            //每100个股票，请求一次，这里可以优化，但是可知所以股票一次请求新浪api接口，是不可以的
            var stockDataPath=settings.stockDataHostPathPart;
            var stockArray=[];

            for(var i=0;i<i_hund+1;++i)
            {
                if(i<i_hund)
                {
                    var jLength=(i+1)*sLength;
                    for(var j=i*sLength;j<jLength;++j)
                    {

                        var newStock=new NetStock(stocks[j].number);
                        stockArray.push(newStock);
                        //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                        stockDataPath+=newStock.num_prefix_+newStock.number_+",";
                    }
                    GetChangingStockData(stockDataPath,stockArray);
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
                        GetChangingStockData(stockDataPath,stockArray);
                    }
                }
            }

        });
    }
};

function GetChangingStockData(stockDataPath,stockArray){
    var  stock_data;
    var options={host:settings.stockDataHost,path:stockDataPath};
    options.Connection="keep-alive";
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
            //全部数据拿到,得到一个有100个对象的stockArray对象数组
            //三种股票数据，再处理一下
            for(var k=0;k<stockArray.length;++k){
                //1.正常开盘的股票
                if(stockArray[k].now_price_==undefined)
                {
                    //2.中止上市的股票（什么都获取不到）
                    stockArray[k].today_first_price_=0.00;
                    stockArray[k].yday_end_price_=-1;
                    stockArray[k].now_price_=-1;
                    stockArray[k].today_hightest_price_=0.00;
                    stockArray[k].today_lowest_price_=0.00;
                    stockArray[k].buy_price_=0.00;
                    stockArray[k].sole_price_=0.00;
                    stockArray[k].bargain_amount_=0.00;
                    stockArray[k].bargain_value_=0.00;
                    stockArray[k].rise_rate_=0.00;
                    stockArray[k].rise_value_=0.00;
                }

                if(stockArray[k].today_first_price_==0.00)
                {
                    //3.停牌的股票（名字和昨收，其他都为0)
                    stockArray[k].today_first_price_=0.00;
                    //stockArray[k].yday_end_price_=-1;
                    stockArray[k].now_price_=-1;
                    stockArray[k].today_hightest_price_=0.00;
                    stockArray[k].today_lowest_price_=0.00;
                    stockArray[k].buy_price_=0.00;
                    stockArray[k].sole_price_=0.00;
                    stockArray[k].bargain_amount_=0.00;
                    stockArray[k].bargain_value_=0.00;
                    stockArray[k].rise_rate_=0.00;
                    stockArray[k].rise_value_=0.00;
                }
            }
            ep.emit('got_stock100',stockArray);
        });

        //100个股票请求结束
        stockDataReq.on("error",function(err){
            console.log("Get_Stock100_Error Detail:"+err.message);
        });
    });

};

module.exports=refreshStockModel;