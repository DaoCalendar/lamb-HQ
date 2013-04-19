var mongodb=require('./db.js');

function Stock(stockObj)
{
    this.number_=stockObj.number;
    this.name_=stockObj.name;
    this.pinyin_=stockObj.pinyin;
    this.class1_=stockObj.class1;
    this.class2_=stockObj.class2;
    this.index_=stockObj.index;
};

Stock.prototype.Save=function(callback){
    //单纯的数据文档
    var stock={
        number:this.number_,
        name:this.name_,
        pinyin:this.pinyin_,
        class1:this.class1_,
        class2:this.class2_,
        index:this.index_
    };
    //打开得到一个打开的db
    mongodb.open(function(err,db){
        if(err)
        {
            return callback(err);
        }
        db.collection('stocks',function(err,collection){
            if(err)
            {
                mongodb.close();
                return callback(err);
            }
            //设置stocks collection的对象集合的唯一索引
            collection.ensureIndex('number',{unique:true});
            //可以写入对象文档了
            collection.insert(stock,{safe:true},function(err,stock){
                    mongodb.close();
                    return callback(err,stock);
            });
        });
    });
};

//通过股票代码寻找唯一一个
Stock.prototype.Get=function(callback){
    mongodb.open(function(err,db){
        if(err)
        {
            return callback(err);
        }
        db.collection("stocks",function(err,collection){
            if(err)
            {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({number:this.number},function(err,stock){
                mongodb.close();
                if(stock)
                {
                    return callback(err,stock);
                }else
                {
                   return callback(err,null);
                }
            });

        });
    });
};

//解决股票的序号问题
Stock.prototype.GetStockAmount=function(callback){
    mongodb.open(function(err,db){
        if(err)
        {
            return callback(err);
        }
        db.collection("stocks",function(err,collection){
            if(err)
            {
                mongodb.close();
                return callback(err);
            }
            var stockAmount=collection.find({}).count();
            mongodb.close();
            return callback(err,stockAmount);
        });
    });
}

//通过股票索引index范围获取股票集合
Stock.prototype.GetStockByIndexScope=function(beg,end,callback){
    mongodb.open(function(err,db){
        if(err)
        {
            return callback(err);
        }
        db.collection("stocks",function(err,collection){
            if(err)
            {
                mongodb.close();
                return callback(err);
            }
            var cursor=collection.find({index:{$in:[beg,end]}});
            mongodb.close();
            if(cursor)
            {
               return callback(err,cursor);
            }else
            {
               return callback(err,null);
            }

        });
    });
};

module.exports=Stock;