
/*
 * GET home page.
 */
var http=require('http');
var crypto=require('crypto');
var iconv=require("iconv-lite");
var EventProxy=require('eventproxy');


var NetStock=require("../models/net/Stock.js");
var settings=require("../Settings.js");
var mongoose=require("../models/db/mongoose.js");

var index = function(req, res){

    res.render('index',{layout:"layout"});

};

//mongoose数据库操作
var login=function(req,res)
{
    //登录,post过来的密码验证
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('base64');
    var User=mongoose.model("User");
    User.find({name:req.body.username},function(err,luser){
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

var logout=function(req,res)
{
    req.session.user=null;
    res.redirect("/");
};
var register_get=function(req,res)
{
    res.render('register');
};

//mongoose处理数据库
var register_post=function(req,res){
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
    User.find({name:req.body.username},function(err,user){
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

var stockRefresh=function(req,res){
    var stockNumArray=req.body.stockNums;
    var Stock=mongoose.model('Stock');
    var ep=new EventProxy();
    var stockDataPath=settings.stockDataHostPathPart;
    var stockArray=[];
    var length=stockNumArray.length;
    for(var j=0;j<length;++j)
    {

        var newStock=new NetStock(stockNumArray[j]);
        stockArray.push(newStock);
        //收集所有本次创建的股票，后面拿到数据后，在用stock的数据解析函数
        stockDataPath+=newStock.num_prefix_+newStock.number_+",";
    }

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
            var allStockArrayString='{"currentRows":[';
            for(var k=0;k<stockArray.length;++k){
                if(stockArray[k].now_price_==undefined)
                {
                    //中止上市的股票（什么都获取不到）
                    var stockArrayString='['+
                        '"'+stockArray[k].number_+'",'+
                        '0.00,'+
                        '"--",'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '"--",'+
                        '0.00,'+
                        '0.00'+
                        ']';
                }
                else if(stockArray[k].now_price_==0)
                {
                    //停牌的股票（名字和现价，其他都为0
                    var stockArrayString='['+
                        '"'+stockArray[k].number_+'",'+
                        '0.00,'+
                        '"--",'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        '0.00,'+
                        stockArray[k].yday_end_price_+','+
                        '0.00,'+
                        '0.00'+
                        ']';
                }else{
                    //正常情况的股票
                    var stockArrayString='['+
                        '"'+stockArray[k].number_+'",'+
                        //ajax刷新的时候,不用更新代码和名称，但要传送number做前端识别
                        //'"'+stockArray[k].cname_+'",'+
                        stockArray[k].rise_rate_+','+
                        stockArray[k].now_price_+','+
                        stockArray[k].rise_value_+','+
                        stockArray[k].buy_price_+','+
                        stockArray[k].sole_price_+','+
                        stockArray[k].bargain_amount_+','+
                        stockArray[k].bargain_value_+','+
                        stockArray[k].today_first_price_+','+
                        stockArray[k].yday_end_price_+','+
                        stockArray[k].today_hightest_price_+','+
                        stockArray[k].today_lowest_price_+
                        ']';
                }

                allStockArrayString+=stockArrayString+',';
            }
            //去掉最后逗号
            allStockArrayString=allStockArrayString.substr(0,allStockArrayString.length-1);
            allStockArrayString+=']}';



            res.writeHead(200,{'Content-Type': 'application/json'});
            res.write(allStockArrayString);
            res.end();

        });
    });
    //100个股票请求结束
    stockDataReq.on("error",function(err){
        console.log(err.message);
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
function todayFirstPriceSortDesc(a,b){return b.today_first_price_- a.today_first_price_}
function ydayEndPriceSortDesc(a,b){return b.yday_end_price_- a.yday_end_price_}
function todayHightestPriceSortDesc(a,b){return b.today_hightest_price_- a.today_hightest_price_}
function todayLowesetPriceSortDesc(a,b){return b.today_lowest_price_- a.today_lowest_price_}



var ep=new EventProxy();
var stockDataTableServer=function(req,res){

    var sortFunctionArray=[[numberSortDesc,riseRateSortDesc,
                            nowPriceSortDesc,riseValueSortDesc,
                            buyPriceSortDesc,solePriceSortDesc,
                            bargainAmountSortDesc,bargainValueSortDesc,
                            todayFirstPriceSortDesc,ydayEndPriceSortDesc,
                            todayHightestPriceSortDesc,todayLowesetPriceSortDesc],
                            [numberSortAsc,riseRateSortAsc,
                             nowPriceSortAsc,riseValueSortAsc,
                             buyPriceSortAsc,solePriceSortAsc,
                             bargainAmountSortAsc,bargainValueSortAsc,
                             todayFirstPriceSortAsc,ydayEndPriceSortAsc,
                             todayHightestPriceSortAsc,todayLowesetPriceSortAsc]];
    var ascDesc={"asc":1,"desc":0};

    var sEcho=req.query.sEcho;
    var sortCol=req.query.iSortCol_0==0?req.query.iSortCol_0:req.query.iSortCol_0-1; //有个名称不能排序
    var sortDir=req.query.sSortDir_0;
    var startIndex=parseInt(req.query.iDisplayStart);
    var length=parseInt(req.query.iDisplayLength);
    var endIndex= startIndex+length;
    var DbStock=mongoose.model('Stock');
    var sortOrder=ascDesc[sortDir];
    //获取排序函数
    var sortFunction=sortFunctionArray[sortOrder][sortCol];
    DbStock.find({},function(err,stocks){
        if(err)
        {
            return console.log("Find_All_DbStock_Error Detail:"+err.message);
        }


        var sLength=100;
        var i_hund=parseInt(stocks.length/sLength);
        var i_rest=stocks.length%sLength;
        ep.after('got_stock100',i_rest==0?i_hund:i_hund+1,function(stock100ArrayList){
            //数组合并,生成一个副本
            var allStockArray=stock100ArrayList[0];
            for(var i=1;i<stock100ArrayList.length;++i)
            {
                allStockArray=allStockArray.concat(stock100ArrayList[i]);
            }
            //数组排序函数，生成一个副本，原来已经变了
            allStockArray=allStockArray.sort(sortFunction);

            var iTotalRecords=allStockArray.length;
            var iTotalDisplayRecords=allStockArray.length;
            console.log(iTotalRecords);
            var responseString='{"sEcho":'+sEcho+',"iTotalRecords":"'+iTotalRecords+'","iTotalDisplayRecords":"'+iTotalDisplayRecords+'","aaData":[';
            for(var i=startIndex;i<endIndex;++i)
            {
                var stockArrayString='['+
                    '"'+allStockArray[i].number_+'",'+
                    '"'+allStockArray[i].cname_+'",'+
                    allStockArray[i].rise_rate_+','+
                    allStockArray[i].now_price_+','+
                    allStockArray[i].rise_value_+','+
                    allStockArray[i].buy_price_+','+
                    allStockArray[i].sole_price_+','+
                    allStockArray[i].bargain_amount_+','+
                    allStockArray[i].bargain_value_+','+
                    allStockArray[i].today_first_price_+','+
                    allStockArray[i].yday_end_price_+','+
                    allStockArray[i].today_hightest_price_+','+
                    allStockArray[i].today_lowest_price_+','+
                    '"'+allStockArray[i].pinyin_+'"'+']';
                responseString+=stockArrayString;
                if(i<startIndex+length-1)
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


module.exports=function(app){
    app.get('/', index);

    app.get('/logout',logout);
    app.get('/register',register_get);
    app.get('/stock/dataTableServer',stockDataTableServer);

    app.post('/login',login);
    app.post('/register',register_post);
    app.post('/stock/refresh',stockRefresh);
};