var settings=require("../../Settings.js");

function Stock(stock_number,stock_pinyin,stock_cname)
{
    this.number_=stock_number;
    this.num_prefix_=this.IsShangHaiStock(stock_number)?"sh":"sz";
    this.pinyin_=stock_pinyin;
    this.cname_=stock_cname;

    this.rise_rate_=undefined;
    this.rise_value_=undefined;
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

}
Stock.prototype.IsShangHaiStock=function(stock_number){
	var stockFirstChar=stock_number.charAt(0);
    if("6"==stockFirstChar||"9"==stockFirstChar)
	{
		return true;
	}
    return false;
};

Stock.prototype.SliceAssignStockData=function(dataString){
        var beg=dataString.indexOf("\"")+1;
        var end=dataString.lastIndexOf("\"");
        var stock_data_part=dataString.substring(beg,end);
        var stock_data_array=stock_data_part.split(",");

        this.today_first_price_=(stock_data_array[1]==undefined?0.00:stock_data_array[1]);
        this.yday_end_price_=(stock_data_array[2]==undefined?-1:stock_data_array[2]);  //做“--”展示
        this.now_price_=(stock_data_array[3]==undefined?-1:stock_data_array[3]);   //做“--”展示
        this.today_hightest_price_=(stock_data_array[4]===undefined?0.00:stock_data_array[4]);
        this.today_lowest_price_=(stock_data_array[5]===undefined?0.00:stock_data_array[5]);
        this.buy_price_=(stock_data_array[6]===undefined?0.00:stock_data_array[6]);
        this.sole_price_=(stock_data_array[7]===undefined?0.00:stock_data_array[7]);
        this.bargain_amount_=(stock_data_array[8]===undefined?0.00:(stock_data_array[8]/100).toFixed(2));
        this.bargain_value_=(stock_data_array[9]===undefined?0.00:(stock_data_array[9]/10000).toFixed(2));
        //现价等于0或-1，就是停牌或终止上市
        this.rise_rate_=(this.now_price_==-1||this.now_price_==0.00)?0.00:((this.now_price_-this.yday_end_price_)/this.yday_end_price_*100).toFixed(2);
        this.rise_value_=(this.now_price_==-1||this.now_price_==0.00)?0.00:(this.now_price_-this.yday_end_price_).toFixed(2);

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
