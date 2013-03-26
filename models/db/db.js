var settings=require("../settings.js");
var Db=require("mongodb").exports.Db;
var Server=require("mongodb").exports.Server;
var Connection=require("mongodb").exports.Connection;

module.exports=new Db(settings.db,new Server(settings.host,Connection.DEFAULT_PORT,{}),{});

