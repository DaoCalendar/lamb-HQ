/* Set the defaults for DataTables initialisation */
$.extend( true, $.fn.dataTable.defaults, {
    "sDom": "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>",
    "sPaginationType": "bootstrap",
    "oLanguage": {
        "sLengthMenu": "_MENU_ records per page"
    }
} );
/* Default class modification */
$.extend( $.fn.dataTableExt.oStdClasses, {
    "sWrapper": "dataTables_wrapper form-inline"
} );
/* API method to get paging information */
$.fn.dataTableExt.oApi.fnPagingInfo = function ( oSettings )
{
    return {
        "iStart": oSettings._iDisplayStart,
        "iEnd": oSettings.fnDisplayEnd(),
        "iLength": oSettings._iDisplayLength,
        "iTotal": oSettings.fnRecordsTotal(),
        "iFilteredTotal": oSettings.fnRecordsDisplay(),
        "iPage": oSettings._iDisplayLength === -1 ?
            0 : Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
        "iTotalPages": oSettings._iDisplayLength === -1 ?
            0 : Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
    };
};
/* Bootstrap style pagination control */
$.extend( $.fn.dataTableExt.oPagination, {
    "bootstrap": {
        "fnInit": function( oSettings, nPaging, fnDraw ) {
            var oLang = oSettings.oLanguage.oPaginate;
            var fnClickHandler = function ( e ) {
                e.preventDefault();
                if ( oSettings.oApi._fnPageChange(oSettings, e.data.action) ) {
                    fnDraw( oSettings );
                }
            };
            $(nPaging).addClass('pagination').append(
                '<ul>'+
                    '<li class="prev disabled"><a href="#">&larr; '+oLang.sPrevious+'</a></li>'+
                    '<li class="next disabled"><a href="#">'+oLang.sNext+' &rarr; </a></li>'+
                    '</ul>'
            );
            var els = $('a', nPaging);
            $(els[0]).bind( 'click.DT', { action: "previous" }, fnClickHandler );
            $(els[1]).bind( 'click.DT', { action: "next" }, fnClickHandler );
        },
        "fnUpdate": function ( oSettings, fnDraw ) {
            var iListLength = 5;
            var oPaging = oSettings.oInstance.fnPagingInfo();
            var an = oSettings.aanFeatures.p;
            var i, ien, j, sClass, iStart, iEnd, iHalf=Math.floor(iListLength/2);
            if ( oPaging.iTotalPages < iListLength) {
                iStart = 1;
                iEnd = oPaging.iTotalPages;
            }
            else if ( oPaging.iPage <= iHalf ) {
                iStart = 1;
                iEnd = iListLength;
            } else if ( oPaging.iPage >= (oPaging.iTotalPages-iHalf) ) {
                iStart = oPaging.iTotalPages - iListLength + 1;
                iEnd = oPaging.iTotalPages;
            } else {
                iStart = oPaging.iPage - iHalf + 1;
                iEnd = iStart + iListLength - 1;
            }
            for ( i=0, ien=an.length ; i<ien ; i++ ) {
// Remove the middle elements
                $('li:gt(0)', an[i]).filter(':not(:last)').remove();
// Add the new list items and their event handlers
                for ( j=iStart ; j<=iEnd ; j++ ) {
                    sClass = (j==oPaging.iPage+1) ? 'class="active"' : '';
                    $('<li '+sClass+'><a href="#">'+j+'</a></li>')
                        .insertBefore( $('li:last', an[i])[0] )
                        .bind('click', function (e) {
                            e.preventDefault();
                            oSettings._iDisplayStart = (parseInt($('a', this).text(),10)-1) * oPaging.iLength;
                            fnDraw( oSettings );
                        } );
                }
// Add / remove disabled classes from the static elements
                if ( oPaging.iPage === 0 ) {
                    $('li:first', an[i]).addClass('disabled');
                } else {
                    $('li:first', an[i]).removeClass('disabled');
                }
                if ( oPaging.iPage === oPaging.iTotalPages-1 || oPaging.iTotalPages === 0 ) {
                    $('li:last', an[i]).addClass('disabled');
                } else {
                    $('li:last', an[i]).removeClass('disabled');
                }
            }
        }
    }
} );
/*
 * TableTools Bootstrap compatibility
 * Required TableTools 2.1+
 */
if ( $.fn.DataTable.TableTools ) {
// Set the classes that TableTools uses to something suitable for Bootstrap
    $.extend( true, $.fn.DataTable.TableTools.classes, {
        "container": "DTTT btn-group",
        "buttons": {
            "normal": "btn",
            "disabled": "disabled"
        },
        "collection": {
            "container": "DTTT_dropdown dropdown-menu",
            "buttons": {
                "normal": "",
                "disabled": "disabled"
            }
        },
        "print": {
            "info": "DTTT_print_info modal"
        },
        "select": {
            "row": "active"
        }
    } );
// Have the collection use a bootstrap compatible dropdown
    $.extend( true, $.fn.DataTable.TableTools.DEFAULTS.oTags, {
        "collection": {
            "container": "ul",
            "button": "li",
            "liner": "a"
        }
    } );
}

/* Table initialisation */
$(document).ready(function() {
    var oTable=$('#stockdatatable').dataTable( {
        //"sDom": "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>S>",
        "sDom": "<'row'<'alert alert-success'r>t<'row'<'span6'i>S>",
        "bProcessing":true,
        "oLanguage": {
            'sSearch':'搜索:',
            "sLengthMenu": "展示 _MENU_ 股票/每页",
            'sZeroRecords':"找不到所要的股票,抱歉！",
            'sInfo':"目前是 _START_ 到 _END_ 共 _TOTAL_ 支股票",
            'sEmptyInfo':"目前是 0 到 0 共 0 支股票",
            'sInfoFiltered':"从 _MAX_ 支股票找到",
            'oPaginate':{'sFirst':"首页",'sNext':"下一页",'sPrevious':"上一页",'sLast':"尾页"},
            "sProcessing": "正在加载...",
            "sLoadingRecords": " "
        },
        "sScrollY":"400px",
        "sScrollX": "100%",
        "sScrollXInner": "120%",
        "bScrollCollapse": true,


        'bServerSide':true,
        'sAjaxSource':"/stock/dataTableServer",

        "aoColumnDefs":[
            {"mRender":function(data,type,rowData){return "<a href='#' style='font-size: 15px;'><strong>"+data+"</strong></a>";},"aTargets":[0]},
            {"bSortable":false,"mRender":function(data,type,rowData){return "<a href='#' style='font-size: 15px;'><strong>"+data+"</strong></a>";},"aTargets":[1]}, //名称第2行不能排序
            {
                "mRender":function(data,type,rowData){
                    if(rowData[2]>0)
                    {
                        return  "<p style='color:red;font-size: 18px;'><strong>"+(data==-1?"--":data)+"</strong></p>";
                    }else if(rowData[2]==0)
                    {
                        return  "<p style='color: #000000;font-size: 18px;'><strong>"+(data==-1?"--":data)+"</strong></p>";
                    }else
                    {
                        return  "<p style='color: lime;font-size: 18px;'><strong>"+(data==-1?"--":data)+"</strong></p>";
                    }
                },"aTargets":[2,3,4,5,6,7,8,9,10,11,12]             //根据升幅来决定 这一行除代码 名称外的颜色
            },

            {"bVisible":false,"aTargets":[13]}
        ]




    } );

    var oSettings=oTable.fnSettings();
    var LengthStart=oSettings._iDisplayLength.toString()+oSettings._iDisplayStart.toString();

    $('#stockdatatable_filter input').attr("placeholder","拼音/各列数据");


    setInterval(function(){

        var nowDate=new Date();
        var morBegDate=new Date();
        morBegDate.setHours(9,15,0);

        var morEndDate=new Date();
        morEndDate.setHours(11,31,0);

        var noonBegDate=new Date();
        noonBegDate.setHours(12,59,0);

        var noonEndDate=new Date();
        noonEndDate.setHours(15,1,0);
        if(nowDate>=morBegDate&&nowDate<=morEndDate||nowDate>=noonBegDate&&nowDate<=noonEndDate)
        {

        var length=oTable.$('tr').length;
        var stockNumArray=[];

        for(var i=0;i<length;++i)
        {
            stockNumArray.push(oTable.$('tr').eq(i).children('td').eq(0).text());
        }
        $.ajax({
            url:"/stock/refresh",
            data:{
                    stockNums:stockNumArray
            },
            dataType:"json",
            type:"post",
            success:function(data){
                var stockArray=data.currentRows;
                stockArray.forEach(function(stock){
                    var row=oTable.$("tr").children("td:contains("+stock[0]+")").parent();
                    //涨幅
                    row.children('td').eq(2).text(stock[1]);
                    //现价
                    row.children('td').eq(3).text(stock[2]);
                    //涨跌
                    row.children('td').eq(4).text(stock[3]);
                    //买入
                    row.children('td').eq(5).text(stock[4]);
                   //卖出
                    row.children('td').eq(6).text(stock[5]);
                   //成交量/手
                    row.children('td').eq(7).text(stock[6]);
                   //成交额/万
                    row.children('td').eq(8).text(stock[7]);
                   //今开
                    row.children('td').eq(9).text(stock[8]);
                   //昨收
                    row.children('td').eq(10).text(stock[9]);
                   //最高
                    row.children('td').eq(11).text(stock[10]);
                   //最低
                    row.children('td').eq(12).text(stock[11]);

                });

            },
            error:function(){
                //$('#refresh').removeClass('alert-success').addClass('alert-error').text('刷新股票数据出错,请重刷.');
            }
        });
     }
    },5000);
} );