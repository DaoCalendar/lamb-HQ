
/*
 * GET home page.
 */
var Stock=require("../models/net/Stock.js");

exports.index = function(req, res){
  res.render('index', { title: 'Express',layout:"layout" });
};
exports.stock=function(req,res)
{
    var newStock=new Stock(req.params.number);
    newStock.GetStockData();
    //处理股票代码，请求webservice
    res.render('stock',{number:req.params.number});
}
exports.login=function(req,res)
{
    
}
exports.logout=function(req,res)
{
    
}
exports.register_get=function(req,res)
{
    res.render('register');
}
exports.register_post=function(req,res)
{
    
}