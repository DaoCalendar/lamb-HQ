var fs=require('fs');
var xml_digester=require('xml-digester');
var Settings=require('../../Settings');

var mongoose=require('./mongoose.js');

var stockConfigXml=Settings.stockConfigXml;

//mongoose数据库操作

function InserteStockToDb(ep)
{
    var Stock=mongoose.model("Stock");

    var digester=xml_digester.XmlDigester({});
    fs.readFile(stockConfigXml,{'encoding':'utf-8'},function(err,stockConfigOriginString){
                if(err)
                {
                    return console.log(err.message);
                }
                var cleanedString = stockConfigOriginString.toString().replace("\ufeff", "");
                digester.digest(cleanedString,function(err,rootObject){
                    if(err)
                    {
                        return console.log(err.message);
                    }
                    var stockArray=rootObject.stocks.stock;

                    stockArray.forEach(function(stock){

                        //如果没有这个股票才存储
                        Stock.findOne({number:stock.number},function(err,e_stock){
                            if(err)
                            {
                               return console.log(err.message);
                            }
                            if(!e_stock)
                            {
                                var newStock=new Stock({
                                    number:stock.number,
                                    prefix:stock.prefix,
                                    cname:stock.cname,
                                    pinyin:stock.pinyin,
                                    class1:stock.class1,
                                    class2:stock.class2,
                                    optional:false
                                });

                                newStock.save(function(err,s_stock){
                                    if(err)
                                    {
                                        return console.log(err.message);
                                    }
                                    ep.emit("exsit",{});
                                });

                            }else
                            {
                                ep.emit("exsit",{});
                            }
                        });
                    });
                });
    });



};

module.exports=InserteStockToDb;