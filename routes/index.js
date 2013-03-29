
/*
 * GET home page.
 */
var Stock=require("../models/net/Stock.js");
var crypto=require('crypto');
var User=require("../models/db/User.js");


var index = function(req, res){

    res.render('index',{layout:"layout"});

};
var stock=function(req,res)
{
    var newStock=new Stock(req.params.number);
    newStock.GetRenderStockData(req,res);
};
var login=function(req,res)
{
    //登录,post过来的密码验证
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('base64');
    var user=new User({name:req.body.username,password:password});
    user.Get(user.name,function(err,luser){
        if(err)
        {
            req.flash("error",err);
            res.redirect("/");
        }
        if(luser){
            if(luser.password!=user.password)//根据一个用户名寻找的,可能有几种情况
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
var register_post=function(req,res)
{
    if(req.body['repassword']!=req.body['password'])
    {
        req.flash("error","两次输入的密码不一致");
        return res.redirect('/register');
    }
    //加密密码，生成密码的散列表
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('base64');

    var newUser=new User({name:req.body.username,password:password});

    //检查用户是否存在

    newUser.Get(newUser.name,function(err,user){
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
        newUser.Save(function(err){
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


module.exports=function(app){
    app.get('/', index);
   // app.get('/users',list);
    app.get('/stock/:number',stock);
    app.get('/logout',logout);
    app.get('/register',register_get);

    app.post('/login',login);
    app.post('/register',register_post);
};