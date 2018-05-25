"use strict";

// var script = document.createElement("script");
// script.type = "text/javascript";
// script.src = "js/jquery-3.3.1.min.js";

// var NebPayScript = document.createElement("script");
// NebPayScript.type = "text/javascript";
// NebPayScript.src = "js/nebPay.js";
//

var NebPay = require("nebpay");
var nebPay = new NebPay();
var serialNumber;
//var callbackUrl = NebPay.config.mainnetUrl;
var callbackUrl = NebPay.config.testnetUrl;
var intervalQuery;

var dappAddress = "n1zRenwNRXVwY6akcF4rUNoKhmNWP9bhSq8";

$("#confirm").click(function () {
    var to = dappAddress;
    var value = "0.00000001";    //NAS
    var callFunction = "newOrder";
    var callArgsObj = {
        productName : $("#produceName").val(),
        productModel : $("#produceModel").val(),
        email : $("#email").val()
    }
    var callArgs = JSON.stringify([JSON.stringify(callArgsObj)]);
    serialNumber = nebPay.call(to, value, callFunction, callArgs, {
        listener: listener,       //设置listener, 处理交易返回信息
        callback: callbackUrl
    });

    intervalQuery = setInterval(function () {
        funcIntervalQuery();
    }, 11000);

})

function funcIntervalQuery() {
    var options = {
        callback: callbackUrl
    };
    nebPay.queryPayInfo(serialNumber,options)
        .then(function (resp) {
            console.log("tx result: " + resp)   //resp is a JSON string
            var respObject = JSON.parse(resp)
            if(respObject.code === 0 && respObject.data.status === 1){
                alert(`send new order succeed!`);

                clearInterval(intervalQuery)
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

function listener( resp) {
    console.log("response of newOrder: " + JSON.stringify(resp))

}