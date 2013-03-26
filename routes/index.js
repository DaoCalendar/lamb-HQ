
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
    newStock.GetRenderStockData(req,res);
}
exports.login=function(req,res)
{
       var newUser=new User();
       if(User.Verify())
       {
           res.render('index',{username:User.name});
       }else
       {
           res.render('index',{});
       }
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