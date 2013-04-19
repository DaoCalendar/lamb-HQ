var mongodb=require("./db.js"); //生成一个可用的数据库对象

function User(newUser){
    this.name=newUser.name;
    this.password=newUser.password;

};

User.prototype.Save=function(callback){
    //要有一个对象文档,单纯的数据文档
    var user={
        name:this.name,
        password:this.password
    };
    //打开数据库
    mongodb.open(function(err,db){
        if(err)
        {
            //打开失败不需要mongodb.close();
            return callback(err);
        }
        //打开成功
        //设置寻找对象的唯一索引，为这种对对象的字段name
        //先获取特定名字的collection集合（users）,没有users,就第一次创建,回调获得collection

        db.collection('users',function(err,collection){
            if(err)
            {
                //获取collection时失败，关闭数据库
                mongodb.close();
                return callback(err);
            }
            //获取对象集合成功
            //设置对象字段索引index
            collection.ensureIndex('name',{unique:true});
            //就可以写入文档了
            collection.insert(user,{safe:true},function(err,user){
                //插入数据库之后，所有数据库操作完成，关闭数据库
                mongodb.close();
                return callback(err,user);
            });
        });


    });

};

User.prototype.Get=function(username,callback){
    //打开
    mongodb.open(function(err,db){

        if(err)
        {
            //打开失败不需要mongodb.close();
            return callback(err);
        }
        //寻找name属性为username的文档
        db.collection("users",function(err,collection){
            if(err)
            {
                mongodb.close();
                callback(err);
            }
            collection.findOne({name:username},function(err,doc){
                //回调函数第一件事就是释放数据库资源，关闭数据库
                mongodb.close();
                if(err)
                {
                    return callback(err);
                }
                if(doc) //找到一个空的文档
                {
                    //封装一个user文档数据的对象为一个User对像,传到外面的回调函数定义体中执行
                    var user=new User(doc);
                    return callback(err,user);
                }else
                {
                    //空的User对像
                    return callback(err,null);
                }
            });

        });

    });
};

module.exports=User;