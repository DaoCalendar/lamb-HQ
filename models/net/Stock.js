var http=require("http");
var iconv=require("iconv-lite");
function Stock(stock_number)
{
    this.number_=stock_number;
    this.num_prefix_=this.IsShangHaiStock(stock_number)?"sh":"sz";
    this.source_host_="hq.sinajs.cn";
    this.source_host_path_="/list="+this.num_prefix_+this.number_;
    this.name_=undefined;
    this.today_first_price_=undefined;
    this.yday_end_price_=undefined;
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
    
    this.date_=undefined;
    this.time_=undefined;
    //保存所有的股票实时数据
    this.stock_data_=new String();
}
Stock.prototype.IsShangHaiStock=function(stock_number){
	if("6"==stock_number.charAt(0))
	{
		return true;
	}
    return false;
};
Stock.prototype.GetRenderStockData=function(globalReq,globalRes){
    var options={host:this.source_host_,path:this.source_host_path_};
    var Stock=this;  //this还是调用Stock一个对象
    var stock_data;
    var req=http.get(options,function(res){
        console.log("Status:"+res.statusCode);
        for(var prot in res.headers)
        {
            console.log(res.headers[prot]);
        }
        res.setEncoding("binary");
        res.on('data',function(data){       //先得到所有的stock_data，再处理stock_data，得有一个变量保存
            stock_data+=data;
            console.log(data);
        });
        res.on('end',function(){
            var buf=new Buffer(stock_data,'binary');
            Stock.stock_data_=iconv.decode(buf,'GBK');
            Stock.SliceAssignStockData();
            globalRes.render("stock",{stock:Stock,layout:false});
            console.log("accepted all data:",Stock.stock_data_);
        });
	});
    req.on('error',function(e){
        console.log(e.message);
    });
};
Stock.prototype.SliceAssignStockData=function(){
        var beg=this.stock_data_.indexOf("\"")+1;
        var end=this.stock_data_.lastIndexOf("\"");
        var stock_data_part=this.stock_data_.substring(beg,end);
        var stock_data_array=stock_data_part.split(",");
        this.name_=stock_data_array[0];
        this.today_first_price_=stock_data_array[1];
        this.yday_end_price_=stock_data_array[2];
        this.now_price_=stock_data_array[3];
        this.today_hightest_price_=stock_data_array[4];
        this.today_lowest_price_=stock_data_array[5];
        this.buy_price_=stock_data_array[6];
        this.sole_price_=stock_data_array[7];
        this.bargain_amount_=stock_data_array[8];
        this.bargain_value_=stock_data_array[9];

        //buy_one to buy_five
        this.buy_one_amount_=stock_data_array[10];
        this.buy_one_price_=stock_data_array[11];
        this.buy_two_amount_=stock_data_array[12];
        this.buy_two_price_=stock_data_array[13];
        this.buy_three_amount_=stock_data_array[14];
        this.buy_three_price_=stock_data_array[15];
        this.buy_four_amount_=stock_data_array[16];
        this.buy_four_price_=stock_data_array[17];
        this.buy_five_amount_=stock_data_array[18];
        this.buy_five_price_=stock_data_array[19];

        //sole_one to sole_five
        this.sole_one_amount_=stock_data_array[20];
        this.sole_one_price_=stock_data_array[21];
        this.sole_two_amount_=stock_data_array[22];
        this.sole_two_price_=stock_data_array[23];
        this.sole_three_amount_=stock_data_array[24];
        this.sole_three_price_=stock_data_array[25];
        this.sole_four_amount_=stock_data_array[26];
        this.sole_four_price_=stock_data_array[27];
        this.sole_five_amount_=stock_data_array[28];
        this.sole_five_price_=stock_data_array[29];
        this.date_=stock_data_array[30];
        this.time_=stock_data_array[31];
};

module.exports=Stock;
