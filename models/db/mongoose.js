var settings=require("../../settings.js");
var Db=require("mongodb").Db;
var Server=require("mongodb").Server;
var Connection=require("mongodb").Connection;


var mongoose=require('mongoose');

mongoose.connect("mongodb://"+settings.dbHost+"/"+settings.dbName);

//定义数据库对象模型
var Schema=mongoose.Schema;
var ObjectId=Schema.ObjectId;
//股票对象模型
var Stock=new Schema({
    number:String,
    prefix:String,
    cname:String,
    pinyin:String,
    class1:String,
    class2:String,
    optional:Boolean
});

//用户对象模型

var User=new Schema({
    name:{type:String,index:true},
    password:String
});

//注册对象模型
mongoose.model('Stock',Stock);
mongoose.model('User',User);

module.exports=mongoose;