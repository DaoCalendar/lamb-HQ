
/**
 * Module dependencies.
 */

var express = require('express')
  ,partials=require("express-partials")
  ,flash=require("connect-flash")
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');
var settings=require("./settings.js");
var connect=require("./node_modules/express/node_modules/connect");
var mongoStore=require("connect-mongo")(connect);
var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('ip',process.env.ip);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
      secret:settings.cookieSecret,
      store:new mongoStore({
       db:settings.db
      })
  })
  );

  app.use(flash());
  app.use(function(req,res,next){
        res.locals.user=req.session.user;
        res.locals.error=req.flash("error");
        res.locals.success=req.flash("success");
        next();
    });

  app.use(app.router);


  app.use(express.static(path.join(__dirname, 'public')));


});
app.configure('development', function(){
  app.use(express.errorHandler());
});
routes(app);

http.createServer(app).listen(app.get('port'),app.get("ip"),function(){
    console.log("Express server listening on port " + app.get('port'));
});
