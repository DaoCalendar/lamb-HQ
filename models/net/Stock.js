var http=require("http");

function Stock(stock_number)
{
    this.number_=stock_number;
    this.num_prefix=this.IsShangHaiStock(stock_number)?"sh":"sz";
    this.source_host="http://hq.sinajs.cn"
    this.source_host_path="/list="+this.num_prefix+this.number;    
    this.name_=undefined;
    this.today_first_price_=undefined;
    this.today_end_price_=undefined;
    this.now_price_=undefined;
    this.today_hightest_price_=undefined;
    this.today_lowest_price_=undefined;
    this.buy_price_=undefined;
    this.sole_price_=undefined;
    this.bargain_amount_=undefined;
    this.bargain_value_=undefined;
    
    //buy_one to buy_five
    this.buy_one_amount_=undefined;
    this.buy_one_price_=undefined;
    this.buy_two_amount_=undefined;
    this.buy_two_price_=undefined;
    this.buy_three_amount_=undefined;
    this.buy_three_price_=undefined;
    this.buy_four_amount_=undefined;
    this.buy_four_price_=undefined;
    this.buy_five_amount_=undefined;
    this.buy_five_price_=undefined;
    
    //sole_one to sole_five
    this.sole_one_amount_=undefined;
    this.sole_one_price_=undefined;
    this.sole_two_amount_=undefined;
    this.sole_two_price_=undefined;
    this.sole_three_amount_=undefined;
    this.sole_three_price_=undefined;
    this.sole_four_amount_=undefined;
    this.sole_four_price_=undefined;
    this.sole_five_amount_=undefined;
    this.sole_five_price_=undefined;
    
    this.date=undefined;
    this.time=undefined;
    //保存所有的股票实时数据
    this.stock_data=new String("");
}
Stock.prototype.IsShangHaiStock=function(stock_number){
	if("6"==stock_number.charAt(0))
	{
		return true;
	}

};
Stock.prototype.GetStockData=function(){
    var options={host:this.source_host,path:this.source_host_path};
    var stock_data=this.stock_data;         //指向Stock的String Object，是一个引用,res里面改变
    http.get(options,function(res){
        res.setEncoding("utf8");
        res.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stock_data+=data;
            console.log(data);
        });
	});
};
Stock.prototype.SliceStockData=function(){
    
};

module.exports=Stock;
