
/**
 * Module dependencies.
 */

var express = require('express')
  ,partials=require("express-partials")
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

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
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/stock/:number',routes.stock);
app.get('logout',routes.logout);
app.get('/register',routes.register_get);

app.post('/login',routes.login);
app.post('/register',routes.register_post);
http.createServer(app).listen(app.get('port'),app.get('ip'),function(){
  console.log("Express server listening on port " + app.get('port'));
});
