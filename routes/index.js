
/*
 * GET home page.
 */
var http=require('http');
var crypto=require('crypto');
var iconv=require("iconv-lite");
var EventProxy=require('eventproxy');


var NetStock=require("../models/net/Stock.js");
var NetIndex=require("../models/net/Index.js");
var settings=require("../Settings.js");
var mongoose=require("../models/db/mongoose.js");

var ep=new EventProxy();

function GetFentryArray(prefixNumberArray)
{
    var FentryDataPath=settings.stockOrIndexDataHostPathPart;
    var FentryArray=[];
    for(var i=0;i<prefixNumberArray.length;++i)
    {
            var   Fentry;
            if(prefixNumberArray[i].substr(0,2)=="s_")
            {
                Fentry=new NetIndex(prefixNumberArray[i].substr(4),undefined,undefined,prefixNumberArray[i].substr(0,4));
            }else{
                Fentry=new NetStock(prefixNumberArray[i].substr(2),undefined);
            }
            FentryArray.push(Fentry);
            //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
        FentryDataPath+=prefixNumberArray[i]+",";
    }
    var  Fentry_data;
    var options={host:settings.stockOrIndexDataHost,path:FentryDataPath};
    var FentryDataReq= http.get(options,function(FentryDataRes){
        FentryDataRes.setEncoding("binary");
        FentryDataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            Fentry_data+=data;
        }).on('end',function(){
                var buf=new Buffer(Fentry_data,'binary');
                var Fentry_data_=iconv.decode(buf,'GBK');


                var FentryDataArray=Fentry_data_.split(";");
                //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
                for(var k=0;k<FentryArray.length;++k)
                {
                    FentryArray[k].SliceAssignData(FentryDataArray[k]);
                }
                ep.emit("Get_FentryArray_OK",FentryArray);
            }).on('error',function(err){
                return  console.log("FentryData Response_Error: Status="+stockDataRes.statusCode+" Detail: "+err.message);
            });
    });
    //100个股票请求结束
    FentryDataReq.on("error",function(err){
        return console.log("FentryData Request_Error Status="+stockDataReq.statusCode+" Detail: "+err.message);
    });

}


var Index = function(req, res){
    if(res.locals.classNumber==undefined)
    {
        res.locals.classNumber=0;
    }
    var recentStockOrIndexArray;
    if(req.session.recentStockOrIndexArray==undefined)
    {
        recentStockOrIndexArray=[];
    }else
    {
        recentStockOrIndexArray=req.session.recentStockOrIndexArray;//获取最近访问股session
    }
    var prefixNumberArray=["s_sh000001","s_sz399001"];
    GetFentryArray(prefixNumberArray);
    ep.after("Get_FentryArray_OK",1,function(FentryAA){
        var FentryArray=FentryAA[0];
        res.render('index',{shIndex:FentryArray[0],szIndex:FentryArray[1],recentStockOrIndexArray:recentStockOrIndexArray,stockMarketNav:settings.stockMarketNav,layout:"layout"});
    });
};
var IndexRefresh=function(req,res){
    //输入
        var prefixNumberArray=req.body.prefixNumberArray;
    //输出
        GetFentryArray(prefixNumberArray);
        ep.after("Get_FentryArray_OK",1,function(FentryAA){
            var FentryArray=FentryAA[0];
            var responseString='{"FentryArray":['
            for(var i=0;i<FentryArray.length;++i)
            {
                    var stockOrIndexArrayString='['+
                            '"'+FentryArray[i].cname_+'",'+
                                FentryArray[i].now_price_+','+
                                FentryArray[i].rise_value_+','+
                                FentryArray[i].rise_rate_+
                            ']';
                    responseString+=stockOrIndexArrayString;
                   if(i<FentryArray.length-1)
                   {
                       responseString+=",";
                   }
            }
            responseString+="]}";
            res.writeHead(200,{'Content-Type': 'application/json'});
            res.write(responseString);
            res.end();
        });
};

function GetIndexOfArray(array,item)
{
    for(var i=0;i<array.length;++i)
    {
        if(array[i]==item)
        {
            return i;
        }
    }
    return -1;
}
var NumberOfClass=function(req, res){
    var className=req.query.className;
    //(404排除)
    if(className==undefined)
    {
        res.locals.classNumber=0;//默认0对应沪深股市
    }else{
        var classArray=settings.classArray;
        res.locals.classNumber=GetIndexOfArray(classArray,className);
    }
    if(className=="指数板块")
    {
        var recentStockOrIndexArray;
        if(req.session.recentStockOrIndexArray==undefined)
        {
            recentStockOrIndexArray=[];
        }else
        {
            recentStockOrIndexArray=req.session.recentStockOrIndexArray;//获取最近访问股session
        }
        var prefixNumberArray=["s_sh000001","s_sz399001"];
        GetFentryArray(prefixNumberArray);
        ep.after("Get_FentryArray_OK",1,function(FentryAA){
            var FentryArray=FentryAA[0];
            res.render("stockIndex",{shIndex:FentryArray[0],szIndex:FentryArray[1],recentStockOrIndexArray:recentStockOrIndexArray,stockMarketNav:settings.stockMarketNav,layout:"stockIndexLayout"})
        });

    }else
    {
        var recentStockOrIndexArray;
        if(req.session.recentStockOrIndexArray==undefined)
        {
            recentStockOrIndexArray=[];
        }else
        {
            recentStockOrIndexArray=req.session.recentStockOrIndexArray;//获取最近访问股session
        }
        var prefixNumberArray=["s_sh000001","s_sz399001"];
        GetFentryArray(prefixNumberArray);
        ep.after("Get_FentryArray_OK",1,function(FentryAA){
            var FentryArray=FentryAA[0];
            res.render('index',{shIndex:FentryArray[0],szIndex:FentryArray[1],recentStockOrIndexArray:recentStockOrIndexArray,stockMarketNav:settings.stockMarketNav,layout:"layout"});
        });
    }

};

//mongoose数据库操作
var Login=function(req,res)
{
    //登录,post过来的密码验证
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('base64');
    var User=mongoose.model("User");
    User.findOne({name:req.body.username},function(err,luser){
        if(err)
        {
            req.flash("error",err);
            res.redirect("/");
        }
        if(luser){
            if(luser.password!=password)//根据一个用户名寻找的,可能有几种情况
            {
                req.flash("error","密码不正确");
                res.redirect("/");
            }else{
                req.flash("success","登录成功");
                req.session.user=luser;
                res.redirect("/");
            }
        }else{
            req.flash("error","用户名不存在");
            res.redirect("/");
        }
    });

};

var Logout=function(req,res)
{
    req.session.user=null;
    res.redirect("/");
};
var GetRegister=function(req,res)
{
    res.render('register',{layout:"basicLayout"});
};

//mongoose处理数据库
var PostRegister=function(req,res){
    if(req.body['repassword']!=req.body['password'])
    {
        req.flash("error","两次输入的密码不一致");
        return res.redirect('/register');
    }
    //加密密码，生成密码的散列表
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('base64');

    //数据库操作
    var User=mongoose.model('User');
    User.findOne({name:req.body.username},function(err,user){
        if(user)
        {
            //用户存在
            err="用户已存在";
        }
        if(err)
        {
            req.flash("error",err);
            return res.redirect("/register");
        }

        //用户不存在，存入,只有一个回调,要在get的回调函数里面save,不然同时newUser.Get后newUser.Save,报错open multiple times
        var newUser=new User({
            name:req.body.username,
            password:password
        });
        newUser.save(function(err){
            if(err)
            {
                req.flash("error",err);
                return res.redirect("/register");
            }
            req.session.user=newUser;
            req.flash("success","注册成功");
            res.redirect('/');
        });

    });
};



//排序函数返回一个Number,而不能是Boolean
function numberSortAsc(a,b){return a.number_- b.number_;}
function riseRateSortAsc(a,b){return a.rise_rate_- b.rise_rate_}
function nowPriceSortAsc(a,b){return a.now_price_- b.now_price_}
function riseValueSortAsc(a,b){return a.rise_value_- b.rise_value_}
function buyPriceSortAsc(a,b){return a.buy_price_- b.buy_price_}
function solePriceSortAsc(a,b){return a.sole_price_- b.sole_price_}
function bargainAmountSortAsc(a,b){return a.bargain_amount_- b.bargain_amount_}
function bargainValueSortAsc(a,b){return a.bargain_value_- b.bargain_value_}
function todayFirstPriceSortAsc(a,b){return a.today_first_price_- b.today_first_price_}
function ydayEndPriceSortAsc(a,b){return a.yday_end_price_- b.yday_end_price_}
function todayHightestPriceSortAsc(a,b){return a.today_hightest_price_- b.today_hightest_price_}
function todayLowesetPriceSortAsc(a,b){return a.today_lowest_price_- b.today_lowest_price_}

function numberSortDesc(a,b){return b.number_- a.number_;}
function riseRateSortDesc(a,b){return b.rise_rate_- a.rise_rate_}
function nowPriceSortDesc(a,b){return b.now_price_- a.now_price_}
function riseValueSortDesc(a,b){return b.rise_value_- a.rise_value_}
function buyPriceSortDesc(a,b){return b.buy_price_- a.buy_price_}
function solePriceSortDesc(a,b){return b.sole_price_- a.sole_price_}
function bargainAmountSortDesc(a,b){return b.bargain_amount_- a.bargain_amount_}
function bargainValueSortDesc(a,b){return b.bargain_value_- a.bargain_value_}
function ydayEndPriceSortDesc(a,b){return b.yday_end_price_- a.yday_end_price_}
function todayFirstPriceSortDesc(a,b){return b.today_first_price_- a.today_first_price_}
function todayHightestPriceSortDesc(a,b){return b.today_hightest_price_- a.today_hightest_price_}
function todayLowesetPriceSortDesc(a,b){return b.today_lowest_price_- a.today_lowest_price_}

var sortFunctionArray=[[numberSortDesc,riseRateSortDesc,
    nowPriceSortDesc,riseValueSortDesc,
    bargainAmountSortDesc,bargainValueSortDesc,
    ydayEndPriceSortDesc,todayFirstPriceSortDesc,
    buyPriceSortDesc,solePriceSortDesc,
    todayHightestPriceSortDesc,todayLowesetPriceSortDesc],
    [numberSortAsc,riseRateSortAsc,
        nowPriceSortAsc,riseValueSortAsc,
        bargainAmountSortAsc,bargainValueSortAsc,
        ydayEndPriceSortAsc,todayFirstPriceSortAsc,
        buyPriceSortAsc,solePriceSortAsc,
        todayHightestPriceSortAsc,todayLowesetPriceSortAsc]];

var ascDesc={"asc":1,"desc":0};



var StockRefresh=function(req,res){
    //输入
    var stockOrIndex3ItemArray=req.body.stockOrIndex3Items;


    //输出
    var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
    var stockOrIndexArray=[];
    var length=stockOrIndex3ItemArray.length;

    for(var j=0;j<length;++j)
    {
        var   marketData;
        if(stockOrIndex3ItemArray[j].prefix.substr(0,2)=="s_")
        {
            marketData=new NetIndex(stockOrIndex3ItemArray[j].number,undefined,stockOrIndex3ItemArray[j].cname,stockOrIndex3ItemArray[j].prefix);
        }else{
            marketData=new NetStock(stockOrIndex3ItemArray[j].number,undefined,stockOrIndex3ItemArray[j].cname);
        }
        stockOrIndexArray.push(marketData);
        //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
        stockOrIndexDataPath+=marketData.num_prefix_+marketData.number_+",";
    }

    var  stock_data;
    var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
    //超时处理
    /*
     var req=null,request_timeout=null;
     request_timeout=setTimeout(function(){
     request_timeout=null;
     req.abort();
     console.log("Request Timeout Error.");
     },5000);
     */
    var stockDataReq= http.get(options,function(stockDataRes){
        stockDataRes.setEncoding("binary");
        stockDataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stock_data+=data;
        }).on('end',function(){
                var buf=new Buffer(stock_data,'binary');
                var stock_data_=iconv.decode(buf,'GBK');


                var stockOrIndexDataArray=stock_data_.split(";");
                //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
                for(var k=0;k<stockOrIndexArray.length;++k)
                {
                    stockOrIndexArray[k].SliceAssignData(stockOrIndexDataArray[k]);
                }
                //全部数据拿到
                //再排序！
                var sortingCol=req.body.sortingCol;
                var sortCol;
                if(sortingCol==0)
                {
                    sortCol=0;     //序号不排序,但是默认是代码号排序
                }else{
                    sortCol=sortingCol==1?sortingCol-1:sortingCol-2; //有个序号,名称不能排序
                }
                var sortingDir=req.body.sortingDir;
                var sortOrder=ascDesc[sortingDir];
                //获取排序函数
                var sortFunction=sortFunctionArray[sortOrder][sortCol];

                //数组排序函数，生成一个副本，原来已经变了
                //stockArray是只有Number初始化的,要动态刷新，即代码,名称,拼音都要（所以这里要求）
                stockOrIndexArray=stockOrIndexArray.sort(sortFunction);


                var allStockOrIndexArrayString='{"currentRows":[';
                for(var k=0;k<stockOrIndexArray.length;++k)
                {
                    var stockOrIndexArrayString;
                    if(stockOrIndexArray[k].num_prefix_.substr(0,2)=="s_")
                    {
                        stockOrIndexArrayString='['+
                            '"'+stockOrIndexArray[k].number_+'",'+
                            '"'+stockOrIndexArray[k].cname_+'",'+
                            stockOrIndexArray[k].rise_rate_+','+
                            ((stockOrIndexArray[k].now_price_==-1||stockOrIndexArray[k].now_price_==0.00)?'"--"':stockOrIndexArray[k].now_price_)+','+
                            stockOrIndexArray[k].rise_value_+','+
                            stockOrIndexArray[k].bargain_amount_+','+
                            stockOrIndexArray[k].bargain_value_+','+
                            (stockOrIndexArray[k].yday_end_price_==-1?'"--"':stockOrIndexArray[k].yday_end_price_)+
                            ',"'+stockOrIndexArray[k].num_prefix_+'"'+
                            ']';

                    }else
                    {
                        stockOrIndexArrayString='['+
                            '"'+stockOrIndexArray[k].number_+'",'+
                            '"'+stockOrIndexArray[k].cname_+'",'+
                            stockOrIndexArray[k].rise_rate_+','+
                            ((stockOrIndexArray[k].now_price_==-1||stockOrIndexArray[k].now_price_==0.00)?'"--"':stockOrIndexArray[k].now_price_)+','+
                            stockOrIndexArray[k].rise_value_+','+
                            stockOrIndexArray[k].bargain_amount_+','+
                            stockOrIndexArray[k].bargain_value_+','+
                            (stockOrIndexArray[k].yday_end_price_==-1?'"--"':stockOrIndexArray[k].yday_end_price_)+','+
                            stockOrIndexArray[k].today_first_price_+','+
                            stockOrIndexArray[k].buy_price_+','+
                            stockOrIndexArray[k].sole_price_+','+
                            stockOrIndexArray[k].today_hightest_price_+','+
                            stockOrIndexArray[k].today_lowest_price_+
                            ',"'+stockOrIndexArray[k].num_prefix_+'"'+
                            ']';
                    }
                    allStockOrIndexArrayString+=stockOrIndexArrayString+',';
                }
                //去掉最后逗号
                allStockOrIndexArrayString=allStockOrIndexArrayString.substr(0,allStockOrIndexArrayString.length-1);
                allStockOrIndexArrayString+=']}';



                res.writeHead(200,{'Content-Type': 'application/json'});
                res.write(allStockOrIndexArrayString);
                res.end();

            }).on('error',function(err){
                return  console.log("Refresh Stocks Response_Error: Status="+stockDataRes.statusCode+" Detail: "+err.message);
            });
    });
    //100个股票请求结束
    stockDataReq.on("error",function(err){
        return console.log("Refresh Stocks Request_Error Status="+stockDataReq.statusCode+" Detail: "+err.message);
    });

};
 var OptionalRefresh=function(req,res){
     //输入,当自选股为0时，是一个空数组[]，服务器端为undfined(解决了404)
     var stockOrIndex3ItemArray=req.body.stockOrIndex3Items;

     if(stockOrIndex3ItemArray!=undefined&&stockOrIndex3ItemArray.length!=0)
     {
             //输出
             var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
             var stockOrIndexArray=[];
             var length=stockOrIndex3ItemArray.length;

             for(var j=0;j<length;++j)
             {
                 var   marketData;
                 if(stockOrIndex3ItemArray[j].prefix.substr(0,2)=="s_")
                 {
                     marketData=new NetIndex(stockOrIndex3ItemArray[j].number,undefined,stockOrIndex3ItemArray[j].cname,stockOrIndex3ItemArray[j].prefix);
                 }else{
                     marketData=new NetStock(stockOrIndex3ItemArray[j].number,undefined,stockOrIndex3ItemArray[j].cname);
                 }
                 stockOrIndexArray.push(marketData);
                 //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                 stockOrIndexDataPath+=marketData.num_prefix_+marketData.number_+",";
             }

             var  stock_data;
             var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
             //超时处理
             /*
              var req=null,request_timeout=null;
              request_timeout=setTimeout(function(){
              request_timeout=null;
              req.abort();
              console.log("Request Timeout Error.");
              },5000);
              */
             var stockDataReq= http.get(options,function(stockDataRes){
                 stockDataRes.setEncoding("binary");
                 stockDataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
                     stock_data+=data;
                 }).on('end',function(){
                         var buf=new Buffer(stock_data,'binary');
                         var stock_data_=iconv.decode(buf,'GBK');

                         var stockOrIndexDataArray=stock_data_.split(";");
                         //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
                         for(var k=0;k<stockOrIndexArray.length;++k)
                         {
                             stockOrIndexArray[k].SliceAssignData(stockOrIndexDataArray[k]);
                         }
                         //全部数据拿到
                         //再排序！
                         var sortingCol=req.body.sortingCol;
                         var sortCol;
                         if(sortingCol==0)
                         {
                             sortCol=0;     //序号不排序,但是默认是代码号排序
                         }else{
                             sortCol=sortingCol==1?sortingCol-1:sortingCol-2; //有个序号,名称不能排序
                         }
                         var sortingDir=req.body.sortingDir;
                         var sortOrder=ascDesc[sortingDir];
                         //获取排序函数
                         var sortFunction=sortFunctionArray[sortOrder][sortCol];

                         //数组排序函数，生成一个副本，原来已经变了
                         //stockArray是只有Number初始化的,要动态刷新，即代码,名称,拼音都要（所以这里要求）
                         stockOrIndexArray=stockOrIndexArray.sort(sortFunction);


                         var allStockOrIndexArrayString='{"currentRows":[';
                         for(var k=0;k<stockOrIndexArray.length;++k)
                         {
                             var stockOrIndexArrayString;
                             //由于在自选股同一了指数与股票的数据，这里就只有一种显示数据格式
                                 stockOrIndexArrayString='['+
                                     '"'+stockOrIndexArray[k].number_+'",'+
                                     '"'+stockOrIndexArray[k].cname_+'",'+
                                     stockOrIndexArray[k].rise_rate_+','+
                                     ((stockOrIndexArray[k].now_price_==-1||stockOrIndexArray[k].now_price_==0.00)?'"--"':stockOrIndexArray[k].now_price_)+','+
                                     stockOrIndexArray[k].rise_value_+','+
                                     stockOrIndexArray[k].bargain_amount_+','+
                                     stockOrIndexArray[k].bargain_value_+','+
                                     (stockOrIndexArray[k].yday_end_price_==-1?'"--"':stockOrIndexArray[k].yday_end_price_)+
                                     ',"'+stockOrIndexArray[k].num_prefix_+'"'+
                                     ']';
                             allStockOrIndexArrayString+=stockOrIndexArrayString+',';
                         }
                         //去掉最后逗号
                         allStockOrIndexArrayString=allStockOrIndexArrayString.substr(0,allStockOrIndexArrayString.length-1);
                         allStockOrIndexArrayString+=']}';
                         res.writeHead(200,{'Content-Type': 'application/json'});
                         res.write(allStockOrIndexArrayString);
                         res.end();

                     }).on('error',function(err){
                         return  console.log("Refresh Optionals Response_Error: Status="+stockDataRes.statusCode+" Detail: "+err.message);
                     });
             });
             //股票请求结束
             stockDataReq.on("error",function(err){
                 return console.log("Refresh Optionals Request_Error Status="+stockDataReq.statusCode+" Detail: "+err.message);
             });
     }else{
         allStockOrIndexArrayString='{"currentRows":[]}';
         res.writeHead(200,{'Content-Type': 'application/json'});
         res.write(allStockOrIndexArrayString);
         res.end();
     }
 };

var StockOrIndexDataTableServer=function(req,res){
    var sEcho=req.query.sEcho;
    var iSortCol=req.query.iSortCol_0;
    var sortCol;
    if(iSortCol==0)
    {
        sortCol=0;     //序号不排序,但是默认是代码号排序
    }else{
        sortCol=iSortCol==1?iSortCol-1:iSortCol-2; //有个序号,名称不能排序
    }

    var sortDir=req.query.sSortDir_0;
    var startIndex=parseInt(req.query.iDisplayStart);
    var length=parseInt(req.query.iDisplayLength);
    var endIndex= startIndex+length;
    var sortOrder=ascDesc[sortDir];
    //获取排序函数
    var sortFunction=sortFunctionArray[sortOrder][sortCol];

    //根据classNumber构造find query对象
    var classNumber=req.params.number;
    var className=settings.classArray[classNumber];
    var query;
    if(className=="沪深股市"||className=="全部股票")
    {
        query={class2:{$not:/^指数板块$/}};
    }else if(className=="创业板")
    {
        query={number:/^3\d{5}$/};
    }else
    {
        query={class2:className};
    }
    var DbStock=mongoose.model('Stock');
    DbStock.find(query,function(err,stockOrIndexs){
        if(err)
        {
            return console.log("Find_All_DbStock_Error Detail:"+err.message);
        }
        var sLength=100;
        var i_hund=parseInt(stockOrIndexs.length/sLength);
        var i_rest=stockOrIndexs.length%sLength;
        ep.after('got_stockorIndex100',i_rest==0?i_hund:i_hund+1,function(stockOrIndex100ArrayList){
            //数组合并,生成一个副本
            var allStockOrIndexArray=stockOrIndex100ArrayList[0];
            for(var i=1;i<stockOrIndex100ArrayList.length;++i)
            {
                allStockOrIndexArray=allStockOrIndexArray.concat(stockOrIndex100ArrayList[i]);
            }
            //数组排序函数，生成一个副本，原来已经变了
            allStockOrIndexArray=allStockOrIndexArray.sort(sortFunction);

            var iTotalRecords=allStockOrIndexArray.length;
            var iTotalDisplayRecords=allStockOrIndexArray.length;

            var responseString='{"sEcho":'+sEcho+',"iTotalRecords":"'+iTotalRecords+'","iTotalDisplayRecords":"'+iTotalDisplayRecords+'","aaData":[';

            //处理一下,因为datatable的请求start,与length(108),有可能总的行数,股票数没有108那么多
            if(iTotalRecords<length)
            {
                endIndex=iTotalRecords;
            }
            //展示数据
            for(var i=startIndex;i<endIndex;++i)
            {
                if(className=="指数板块")
                {
                    var stockorIndexArrayString='['+
                        (i+1)+','+
                        '"'+allStockOrIndexArray[i].number_+'",'+
                        '"'+allStockOrIndexArray[i].cname_+'",'+
                        allStockOrIndexArray[i].rise_rate_+','+
                        allStockOrIndexArray[i].now_price_+','+
                        allStockOrIndexArray[i].rise_value_+','+
                        allStockOrIndexArray[i].bargain_amount_+','+
                        allStockOrIndexArray[i].bargain_value_+','+
                        allStockOrIndexArray[i].yday_end_price_+','+
                        '"'+allStockOrIndexArray[i].num_prefix_+'",'+
                        '"'+allStockOrIndexArray[i].pinyin_+'"'+']';
                }else
                {
                    var stockorIndexArrayString='['+
                        (i+1)+','+
                        '"'+allStockOrIndexArray[i].number_+'",'+
                        '"'+allStockOrIndexArray[i].cname_+'",'+
                        allStockOrIndexArray[i].rise_rate_+','+
                        allStockOrIndexArray[i].now_price_+','+
                        allStockOrIndexArray[i].rise_value_+','+
                        allStockOrIndexArray[i].bargain_amount_+','+
                        allStockOrIndexArray[i].bargain_value_+','+
                        allStockOrIndexArray[i].yday_end_price_+','+
                        allStockOrIndexArray[i].today_first_price_+','+
                        allStockOrIndexArray[i].buy_price_+','+
                        allStockOrIndexArray[i].sole_price_+','+
                        allStockOrIndexArray[i].today_hightest_price_+','+
                        allStockOrIndexArray[i].today_lowest_price_+','+
                        '"'+allStockOrIndexArray[i].num_prefix_+'",'+
                        '"'+allStockOrIndexArray[i].pinyin_+'"'+']';
                }

                responseString+=stockorIndexArrayString;
                if(i<endIndex-1)
                {
                    responseString+=',';
                }
            }
            responseString+=']}';
            res.writeHead(200,{'Content-Type': 'text/html'});
            res.write(responseString);
            res.end();
        });


        //每100个股票，请求一次，这里可以优化，但是可知所以股票一次请求新浪api接口，是不可以的
        var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
        var stockOrIndexArray=[];
        for(var i=0;i<i_hund+1;++i)
        {
            if(i<i_hund)
            {
                var jLength=(i+1)*sLength;
                for(var j=i*sLength;j<jLength;++j)
                {
                    //指数还是股票，用什么来分类？
                    if(className=="指数板块")
                    {
                         var newIndex=new NetIndex(stockOrIndexs[j].number,stockOrIndexs[j].pinyin,stockOrIndexs[j].cname,stockOrIndexs[j].class1);
                         stockOrIndexArray.push(newIndex);
                         stockOrIndexDataPath+=newIndex.num_prefix_+newIndex.number_+",";
                    }else
                    {
                        var newStock=new NetStock(stockOrIndexs[j].number,stockOrIndexs[j].pinyin,stockOrIndexs[j].cname);
                        stockOrIndexArray.push(newStock);
                        //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                        stockOrIndexDataPath+=newStock.num_prefix_+newStock.number_+",";
                    }

                }
                GetChangingStockOrIndexData(stockOrIndexDataPath,stockOrIndexArray);
                //重置循环
                stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
                stockOrIndexArray=[];
            }else
            {
                if(i_rest!=0)
                {
                    for(var j=i_hund*sLength;j<i_hund*sLength+i_rest;++j)
                    {
                        if(className=="指数板块")
                        {
                            var newIndex=new NetIndex(stockOrIndexs[j].number,stockOrIndexs[j].pinyin,stockOrIndexs[j].cname,stockOrIndexs[j].class1);
                            stockOrIndexArray.push(newIndex);
                            stockOrIndexDataPath+=newIndex.num_prefix_+newIndex.number_+",";
                        }else
                        {
                            var newStock=new NetStock(stockOrIndexs[j].number,stockOrIndexs[j].pinyin,stockOrIndexs[j].cname);
                            stockOrIndexArray.push(newStock);
                            //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                            stockOrIndexDataPath+=newStock.num_prefix_+newStock.number_+",";
                        }
                    }
                    GetChangingStockOrIndexData(stockOrIndexDataPath,stockOrIndexArray);
                }
            }
        }


    });
};

function GetChangingStockOrIndexData(stockOrIndexDataPath,stockOrIndexArray){
    var  stockOrIndex_data;
    var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
    var dataReq= http.get(options,function(dataRes){

        dataRes.setEncoding("binary");
        dataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stockOrIndex_data+=data;
        }).on('end',function(){
            var buf=new Buffer(stockOrIndex_data,'binary');
            var stockOrIndex_data_=iconv.decode(buf,'GBK');

            var stockOrIndexDataArray=stockOrIndex_data_.split(";");
            //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
            for(var k=0;k<stockOrIndexArray.length;++k)
            {
                stockOrIndexArray[k].SliceAssignData(stockOrIndexDataArray[k]);
            }
            ep.emit('got_stockorIndex100',stockOrIndexArray);
        }).on('error',function(err){
           return console.log("Get_StockorIndex100_Response_Error Status="+dataRes.statusCode+" Detail: "+err.message);
        });
    });

    dataReq.on("error",function(err){

        return console.log("Get_StockorIndex100_Request_Error Status="+dataReq.statusCode+" Detail: "+err.message);
    });

};

function IsStockInRecentStockOrIndexs(stockOrIndexArray,stockOrIndex)
{
     for(var i=0;i<stockOrIndexArray.length;++i)
     {
         if(stockOrIndexArray[i].cname_==stockOrIndex.cname_)
         {
             return true;
         }
     }
     return false;
}
//找不到return -1
function GetIndexInStockArray(stockOrIndexArray,stockOrIndex)
{
    for(var i=0;i<stockOrIndexArray.length;++i)
    {
        if(stockOrIndexArray[i].cname_==stockOrIndex.cname_)
        {
            return i;
        }
    }
    return -1;
}
function ProcessRecentStockOrIndexs(req,newStockOrIndex)
{
    var recentStockOrIndexArray;
    if(req.session.recentStockOrIndexArray==undefined)
    {
        recentStockOrIndexArray=[];
    }else
    {
        recentStockOrIndexArray=req.session.recentStockOrIndexArray;//获取最近访问股session
    }
    if(!IsStockInRecentStockOrIndexs(recentStockOrIndexArray,newStockOrIndex))//是否已存在
    {
        if(recentStockOrIndexArray.length<10)
        {

            recentStockOrIndexArray.push(newStockOrIndex);//最近访问只有10只
            req.session.recentStockOrIndexArray=recentStockOrIndexArray; //更新最近访问session

        }else
        {
            recentStockOrIndexArray.shift();
            recentStockOrIndexArray.push(newStockOrIndex);//多了删除第一,加最后
            req.session.recentStockOrIndexArray=recentStockOrIndexArray; //更新最近访问session
        }
    }else //已经存在的话，改变股票排序,变成排在第一
    {
        stockIndex=GetIndexInStockArray(recentStockOrIndexArray,newStockOrIndex)
        recentStockOrIndexArray.splice(stockIndex,1);
        recentStockOrIndexArray.push(newStockOrIndex);
    }
    return  recentStockOrIndexArray;
}


var DispalySingleStockOrIndexPage=function(req,res){
    //单单通过代码查找数据库不行，传过来的代码和分类（指数与股票分类）因为可能查找不到这个代码的，返回一个空的，所以还要cname
    //输入
    var number=req.query.number;
    var prefix=req.query.prefix;

    if(number==undefined||prefix==undefined)
    {
        res.render("Error404",{layout:"basicLayout"});
        return console.log("SingleStock_Request_Error:Lack params results of 404.");
    }else{
           //输出
            var DbStock=mongoose.model('Stock');
            //查数据库为了获取dbStock.cname
            DbStock.findOne({number:number,prefix:prefix},function(err,dbStockOrIndex){
                if(err)
                {
                    return console.log("Display SingleStockOrIndex Find_Db_Error Detail:"+err.message);
                }

                //实现一个统一的叫法以后股票,指数,基金,期货等都是派生类！marketData(市场数据)
                var marketData;

                if(prefix.substr(0,2)=="s_")
                {
                    marketData=new NetIndex(number,dbStockOrIndex.pinyin,dbStockOrIndex.cname,dbStockOrIndex.class1);

                }else
                {
                    marketData=new NetStock(number,dbStockOrIndex.pinyin,dbStockOrIndex.cname);
                }
                var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
                stockOrIndexDataPath+=marketData.num_prefix_+marketData.number_;

                var  stockorindex_data;
                var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
                var dataReq= http.get(options,function(dataRes){

                    dataRes.setEncoding("binary");
                    dataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
                        stockorindex_data+=data;
                    }).on('end',function(){
                        var buf=new Buffer(stockorindex_data,'binary');
                        var stockorindex_data_=iconv.decode(buf,'GBK');
                        marketData.SliceAssignData(stockorindex_data_);
                        var gifHost=settings.stockOrIndexGifHost;
                        var gifExt=".gif";
                        var num_prefix_;
                        if(prefix.substr(0,2)=="s_")
                        {
                            num_prefix_=marketData.num_prefix_.substr(2);
                        }else
                        {
                            num_prefix_=marketData.num_prefix_
                        }


                        var minGifUrl="http://"+gifHost+settings.stockOrIndexMinGifHostPathPart+num_prefix_+marketData.number_+gifExt;
                        var dailyGifUrl="http://"+gifHost+settings.stockOrIndexDailyGifHostPathPart+num_prefix_+marketData.number_+gifExt;;
                        var weeklyUrl="http://"+gifHost+settings.stockOrIndexWeeklyGifHostPathPart+num_prefix_+marketData.number_+gifExt;;
                        var monthlyUrl="http://"+gifHost+settings.stockOrIndexMonthlyGifHostPathPart+num_prefix_+marketData.number_+gifExt;;
                        var stockOrIndexGifUrl_={'Min':minGifUrl,'Daily':dailyGifUrl,'Weekly':weeklyUrl,'Monthly':monthlyUrl};


                        var recentStockOrIndexs=ProcessRecentStockOrIndexs(req,marketData);
                        if(prefix.substr(0,2)=="s_")
                        {
                            res.render("singleIndex",{index:marketData,indexGifUrl:stockOrIndexGifUrl_,recentStockOrIndexArray:recentStockOrIndexs,optional:dbStockOrIndex.optional,layout:"basicLayout"});
                        }else
                        {
                            res.render("singleStock",{stock:marketData,stockGifUrl:stockOrIndexGifUrl_,recentStockOrIndexArray:recentStockOrIndexs,optional:dbStockOrIndex.optional,layout:"basicLayout"});
                        }

                    }).on('error',function(err){
                        return console.log("SingleStock_Request_Error Status="+dataRes.statusCode+" Detail: "+err.message);
                    });
                });

                dataReq.on("error",function(err){
                    return console.log("SingleStock_Request_Error Status="+dataReq.statusCode+" Detail: "+err.message);
                });
            });
    }
};

var ProcessOptional=function(req,res){
    //输入
    var prefix=req.body.prefix;
    var optionalAction=req.body.optionalAction;
    var optionalNumber=req.body.optionalNumber;
   //输出
    var optionalState;
    //更改自选状态 0就是取消optional:false 1就是加入optional:true
    if(optionalAction=="1")
    {
        optionalState=true;
    }else
    {
        optionalState=false;
    }
    var query={number:optionalNumber,prefix:prefix};

    var DbStock=mongoose.model("Stock");
    DbStock.update(query,{optional:optionalState},function(err,updateAmount){
        if(err)
        {
            var optionalAjaxData='{"success":false}';
            res.writeHead(200,{"Content-Type":"application/json"});
            res.write(optionalAjaxData);
            res.end();
            return console.log("Add_Optional_Stock_Error:Update_OptionalState_Fail");
        }
        //成功跳回
        var optionalAjaxData='{"success":true}';
        res.writeHead(200,{"Content-Type":"application/json"});
        res.write(optionalAjaxData);
        res.end();
    });
};

var SingleStockOrIndexRefresh=function(req,res){
    //输入
    var number=req.body.number;
    var prefix=req.body.prefix;
    var cname=req.body.cname;
    //输出
    var marketData;

    if(prefix.substr(0,2)=="s_")
    {
        marketData=new NetIndex(number,undefined,cname,prefix);

    }else
    {
        marketData=new NetStock(number,undefined,cname);
    }
    var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
    stockOrIndexDataPath+=marketData.num_prefix_+marketData.number_;

    var  stockorindex_data;
    var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
    var dataReq= http.get(options,function(dataRes){

        dataRes.setEncoding("binary");
        dataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stockorindex_data+=data;
        }).on('end',function(){
                var buf=new Buffer(stockorindex_data,'binary');
                var stockorindex_data_=iconv.decode(buf,'GBK');
                marketData.SliceAssignData(stockorindex_data_);
                var responseString;
                if(prefix.substr(0,2)=="s_")
                {
                    responseString='{"cname":"'+marketData.cname_+'",'+
                                    '"number":"'+marketData.number_+'",'+
                                    '"nowPrice":"'+marketData.now_price_+'",'+
                                    '"riseRate":"'+marketData.rise_rate_+'",'+
                                    '"riseValue":"'+marketData.rise_value_+'",'+
                                    '"bargainAmount":"'+marketData.bargain_amount_+'",'+
                                    '"bargainValue":"'+marketData.bargain_value_+'",'+
                                    '"ydayEndPrice":"'+marketData.yday_end_price_+'"'+
                                    '}';
                }else
                {
                    responseString='{"cname":"'+marketData.cname_+'",'+
                                    '"number":"'+marketData.number_+'",'+
                                    '"nowPrice":"'+marketData.now_price_+'",'+
                                    '"todayFirstPrice":"'+marketData.today_first_price_+'",'+
                                    '"todayHightestPrice":"'+marketData.today_hightest_price_+'",'+
                                    '"todayLowestPrice":"'+marketData.today_lowest_price_+'",'+
                                    '"riseRate":"'+marketData.rise_rate_+'",'+
                                    '"riseValue":"'+marketData.rise_value_+'",'+
                                    '"bargainAmount":"'+marketData.bargain_amount_+'",'+
                                    '"bargainValue":"'+marketData.bargain_value_+'",'+
                                    '"ydayEndPrice":"'+marketData.yday_end_price_+'"'+
                                    '}';

                }

                res.writeHead(200,{'Content-Type': 'application/json'});
                res.write(responseString);
                res.end();
        }).on('error',function(err){
                return console.log("Single_Refresh_Error Status="+dataRes.statusCode+" Detail: "+err.message);
        });

        dataReq.on("error",function(err){
            return console.log("Single_Refresh_Error Status="+dataReq.statusCode+" Detail: "+err.message);
        });
    });
};

var recentStockOrIndexRefresh=function(req,res){
    //输入
    var recentStockOrIndexArray=req.body.postRecentStockOrIndexArray;

    //输出(更新的话就肯定是网络获取数据，就要一个一个创建index或stock)
    var recentStockOrIndexObjectArray=[];
    var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
    for(var i=0;i<recentStockOrIndexArray.length;++i)
    {
        var marketData;
        if(recentStockOrIndexArray[i].prefix.substr(0,2)=="s_")
        {
            marketData=new NetIndex(recentStockOrIndexArray[i].number,undefined,recentStockOrIndexArray[i].cname,recentStockOrIndexArray[i].prefix);

        }else
        {
            marketData=new NetStock(recentStockOrIndexArray[i].number,undefined,recentStockOrIndexArray[i].cname);
        }
        stockOrIndexDataPath+=marketData.num_prefix_+marketData.number_+",";
        recentStockOrIndexObjectArray.push(marketData);
    }

    var  stockorindex_data;
    var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
    var dataReq= http.get(options,function(dataRes){

        dataRes.setEncoding("binary");
        dataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stockorindex_data+=data;
        }).on('end',function(){
                var buf=new Buffer(stockorindex_data,'binary');
                var stockorindex_data_=iconv.decode(buf,'GBK');

                var stockOrIndexDataArray=stockorindex_data_.split(";");
                //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
                for(var k=0;k<recentStockOrIndexObjectArray.length;++k)
                {
                    recentStockOrIndexObjectArray[k].SliceAssignData(stockOrIndexDataArray[k]);
                }

                //转化为json字符串(给最近访问提供数据)
                var responseString='{"recentStockOrIndexArray":[';
                var stockOrIndexString;
                for(var i=0;i<recentStockOrIndexObjectArray.length;++i)
                {
                    stockOrIndexString='{'+
                                        '"cname":"'+recentStockOrIndexObjectArray[i].cname_+'",'+
                                        '"number":"'+recentStockOrIndexObjectArray[i].number_+'",'+
                                       '"prefix":"'+recentStockOrIndexObjectArray[i].num_prefix_+'",'+
                                        '"nowPrice":'+recentStockOrIndexObjectArray[i].now_price_+','+
                                        '"riseRate":'+recentStockOrIndexObjectArray[i].rise_rate_+
                                        '}';
                    responseString+=stockOrIndexString;
                    if(i<recentStockOrIndexObjectArray.length-1)
                    {
                        responseString+=',';
                    }
                }
                responseString+=']}';
                res.writeHead(200,{'Content-Type': 'application/json'});
                res.write(responseString);
                res.end();



        }).on('error',function(err){
                return console.log("RecentVisite_Refresh_Error Status="+dataRes.statusCode+" Detail: "+err.message);
        });

        dataReq.on("error",function(err){
            return console.log("RecentVisite_Refresh_Error Status="+dataReq.statusCode+" Detail: "+err.message);
        });
   });

};

function GetChangingOptionalStockOrIndexData(stockOrIndexDataPath,stockOrIndexArray){
    var  stockOrIndex_data;
    var options={host:settings.stockOrIndexDataHost,path:stockOrIndexDataPath};
    var dataReq= http.get(options,function(dataRes){

        dataRes.setEncoding("binary");
        dataRes.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stockOrIndex_data+=data;
        }).on('end',function(){
                var buf=new Buffer(stockOrIndex_data,'binary');
                var stockOrIndex_data_=iconv.decode(buf,'GBK');

                var stockOrIndexDataArray=stockOrIndex_data_.split(";");
                //分割会多出一个“/n”的一个stockData,下面数组用stockArray.length,而不是stockDataArray.length
                for(var k=0;k<stockOrIndexArray.length;++k)
                {
                    stockOrIndexArray[k].SliceAssignData(stockOrIndexDataArray[k]);
                }
                ep.emit('got_optionalStockorIndex100',stockOrIndexArray);
            }).on('error',function(err){
                return console.log("Get_OptionalStockorIndex100_Response_Error Status="+dataRes.statusCode+" Detail: "+err.message);
            });
    });

    dataReq.on("error",function(err){

        return console.log("Get_OptionalStockorIndex100_Request_Error Status="+dataReq.statusCode+" Detail: "+err.message);
    });

};


var OptionalStockOrIndexDataTableServer=function(req,res)
{
    //输入
    var sEcho=req.query.sEcho;
    var iSortCol=req.query.iSortCol_0;
    //输出
    var sortCol;
    if(iSortCol==0)
    {
        sortCol=0;     //序号不排序,但是默认是代码号排序
    }else{
        sortCol=iSortCol==1?iSortCol-1:iSortCol-2; //有个序号,名称不能排序
    }

    var sortDir=req.query.sSortDir_0;
    var startIndex=parseInt(req.query.iDisplayStart);
    var length=parseInt(req.query.iDisplayLength);
    var endIndex= startIndex+length;
    var sortOrder=ascDesc[sortDir];
    //获取排序函数
    var sortFunction=sortFunctionArray[sortOrder][sortCol];

    var DbStock=mongoose.model("Stock");
    DbStock.find({optional:true},function(err,optionalStocks){
        if(err)
        {
            return console.log("Find_All_OptionalDbStock_Error Detail:"+err.message);
        }
       if(optionalStocks.length!=0)
       {

            var sLength=100;
            var i_hund=parseInt(optionalStocks.length/sLength);
            var i_rest=optionalStocks.length%sLength;
            ep.after('got_optionalStockorIndex100',i_rest==0?i_hund:i_hund+1,function(optionalStockOrIndex100ArrayList){
                //数组合并,生成一个副本
                var allOptionalStockOrIndexArray=optionalStockOrIndex100ArrayList[0];
                for(var i=1;i<optionalStockOrIndex100ArrayList.length;++i)
                {
                    allOptionalStockOrIndexArray=allOptionalStockOrIndexArray.concat(optionalStockOrIndex100ArrayList[i]);
                }

                allOptionalStockOrIndexArray=allOptionalStockOrIndexArray.sort(sortFunction);

                var iTotalRecords=allOptionalStockOrIndexArray.length;
                var iTotalDisplayRecords=allOptionalStockOrIndexArray.length;

                var responseString='{"sEcho":'+sEcho+',"iTotalRecords":"'+iTotalRecords+'","iTotalDisplayRecords":"'+iTotalDisplayRecords+'","aaData":[';

                //处理一下,因为datatable的请求start,与length(108),有可能总的行数,股票数没有108那么多
                if(iTotalRecords<length)
                {
                    endIndex=iTotalRecords;
                }
                //展示数据
                for(var i=startIndex;i<endIndex;++i)
                {

                        var stockorIndexArrayString='['+
                            (i+1)+','+
                            '"'+allOptionalStockOrIndexArray[i].number_+'",'+
                            '"'+allOptionalStockOrIndexArray[i].cname_+'",'+
                            allOptionalStockOrIndexArray[i].rise_rate_+','+
                            allOptionalStockOrIndexArray[i].now_price_+','+
                            allOptionalStockOrIndexArray[i].rise_value_+','+
                            allOptionalStockOrIndexArray[i].bargain_amount_+','+
                            allOptionalStockOrIndexArray[i].bargain_value_+','+
                            allOptionalStockOrIndexArray[i].yday_end_price_+','+
                            '"'+allOptionalStockOrIndexArray[i].num_prefix_+'"'+
                            ']';

                            responseString+=stockorIndexArrayString;
                            if(i<endIndex-1)
                            {
                                responseString+=',';
                            }
                }
                responseString+=']}';
                res.writeHead(200,{'Content-Type': 'text/html'});
                res.write(responseString);
                res.end();
            });


            //每100个股票，请求一次，这里可以优化，但是可知所以股票一次请求新浪api接口，是不可以的
            var stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
            var stockOrIndexArray=[];
            for(var i=0;i<i_hund+1;++i)
            {
                if(i<i_hund)
                {
                    var jLength=(i+1)*sLength;
                    for(var j=i*sLength;j<jLength;++j)
                    {
                        //指数还是股票，用什么来分类？
                        if(optionalStocks[j].class1=="指数板块")
                        {
                            var newIndex=new NetIndex(optionalStocks[j].number,optionalStocks[j].pinyin,optionalStocks[j].cname,optionalStocks[j].class1);
                            stockOrIndexArray.push(newIndex);
                            stockOrIndexDataPath+=newIndex.num_prefix_+newIndex.number_+",";
                        }else
                        {
                            var newStock=new NetStock(optionalStocks[j].number,optionalStocks[j].pinyin,optionalStocks[j].cname);
                            stockOrIndexArray.push(newStock);
                            //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                            stockOrIndexDataPath+=newStock.num_prefix_+newStock.number_+",";
                        }

                    }
                    GetChangingOptionalStockOrIndexData(stockOrIndexDataPath,stockOrIndexArray);
                    //重置循环
                    stockOrIndexDataPath=settings.stockOrIndexDataHostPathPart;
                    stockOrIndexArray=[];
                }else
                {
                    if(i_rest!=0)
                    {
                        for(var j=i_hund*sLength;j<i_hund*sLength+i_rest;++j)
                        {
                            if(optionalStocks[j].class1=="指数板块")
                            {
                                var newIndex=new NetIndex(optionalStocks[j].number,optionalStocks[j].pinyin,optionalStocks[j].cname,optionalStocks[j].class1);
                                stockOrIndexArray.push(newIndex);
                                stockOrIndexDataPath+=newIndex.num_prefix_+newIndex.number_+",";
                            }else
                            {
                                var newStock=new NetStock(optionalStocks[j].number,optionalStocks[j].pinyin,optionalStocks[j].cname);
                                stockOrIndexArray.push(newStock);
                                //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
                                stockOrIndexDataPath+=newStock.num_prefix_+newStock.number_+",";
                            }
                        }
                        GetChangingOptionalStockOrIndexData(stockOrIndexDataPath,stockOrIndexArray);
                    }
                }
            }
       }else{
           var iTotalRecords=0;
           var iTotalDisplayRecords=0;
           var responseString='{"sEcho":'+sEcho+',"iTotalRecords":"'+iTotalRecords+'","iTotalDisplayRecords":"'+iTotalDisplayRecords+'","aaData":[';
           responseString+=']}';
           res.writeHead(200,{'Content-Type': 'text/html'});
           res.write(responseString);
           res.end();
       }

    });
};



module.exports=function(app){
    app.get('/',Index);
    app.get('/logout',Logout);
    app.get('/register',GetRegister);
    app.get('/stockOrIndex/dataTableServer/:number',StockOrIndexDataTableServer);
    app.get('/optionalStockOrIndex/dataTableServer',OptionalStockOrIndexDataTableServer);
    app.get('/stockOrIndex',DispalySingleStockOrIndexPage);
    app.get('/c',NumberOfClass);

    app.post('/login',Login);
    app.post('/register',PostRegister);
    app.post('/stock/refresh',StockRefresh);
    app.post('/optional/refresh',OptionalRefresh);
    app.post('/optional',ProcessOptional);
    app.post('/single/refresh',SingleStockOrIndexRefresh);
    app.post('/recentStockOrIndex/refresh',recentStockOrIndexRefresh);
    app.post('/index/refresh',IndexRefresh);
};