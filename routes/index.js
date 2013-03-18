
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express',layout:"layout" });
};
exports.stock=function(req,res)
{
    //处理股票代码，请求webservice
    res.render('stock',{number:12222});
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