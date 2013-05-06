var settings=require("../../Settings.js");
function Index(index_number,index_pinyin,index_cname,index_prefix)
{
    this.number_=index_number;
    this.num_prefix_=index_prefix;
    this.cname_=index_cname;
    this.pinyin_=index_pinyin;

    this.now_price_=undefined;
    this.rise_value_=undefined;
    this.rise_rate_=undefined;
    this.bargain_amount_=undefined;
    this.bargain_value_=undefined;
    this.yday_end_price_=undefined;  //昨收
}


Index.prototype.SliceAssignData=function(dataString){
    var beg=dataString.indexOf("\"")+1;
    var end=dataString.lastIndexOf("\"");
    var index_data_part=dataString.substring(beg,end);
    var index_data_array=index_data_part.split(",");
    //index_data_array[0]名字
    this.cname_=index_data_array[0];
    this.now_price_=index_data_array[1];//现价
    this.rise_value_=index_data_array[2];//涨跌额
    this.rise_rate_=index_data_array[3];//涨跌率
    this.bargain_amount_=index_data_array[4];  //成交量（手）
    this.bargain_value_=index_data_array[5]; //成交额（万元）

    this.yday_end_price_=this.now_price_-this.rise_value_;//昨收
}

module.exports=Index;
