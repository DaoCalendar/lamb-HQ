var settings=require("../../settings.js");
var Db=require("mongodb").Db;
var Server=require("mongodb").Server;
var Connection=require("mongodb").Connection;

module.exports=new Db(settings.db,new Server(settings.host,Connection.DEFAULT_PORT,{}),{});

