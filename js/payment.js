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

//var dappAddress = "n1zRenwNRXVwY6akcF4rUNoKhmNWP9bhSq8";
//var dappAddress = "n1vHrdtqrA6EoMU6SpnnbyKWy2JC2N84c4R";
// var dappAddress = "n1pxz89DgPivqWE7Nbh5rzWR4oSF6vKYJVL";
var dappAddress = "n1kzJd7hXWYB1A2pwtXHuMV47ddwiPSeN32";

var userAddrerss = ""

var nebulas = require("nebulas"),
    Account = nebulas.Account,
    neb = new nebulas.Neb();

neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io"));

$(getUserAddress);

$("#confirm").click(function () {
    var to = dappAddress;
    var value = "1";    //NAS
    var callFunction = "newOrder";
    var callArgsObj = {
        productName : $("#produceName").val(),
        productModel : $("#produceModel").val(),
        email : $("#email").val(),
        beefToken: value,
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
                clearInterval(intervalQuery);
                alert(`send new order succeed!\n` + JSON.stringify(respObject.data,null,''));
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

function listener( resp) {
    console.log("response of newOrder: " + JSON.stringify(resp))
    var respString = JSON.stringify(resp);
    if(respString.search("rejected by user") !== -1){
        clearInterval(intervalQuery)
        alert(respString)
    }else if(respString.search("txhash") !== -1){
        alert("wait for tx result: " + resp.txhash)
    }

}


function getUserAddress() {
    console.log("********* get account ************")
    window.postMessage({
        "target": "contentscript",
        "data":{
        },
        "method": "getAccount",
    }, "*");
}
// listen message from contentscript
window.addEventListener('message', function(e) {
    // e.detail contains the transferred data (can
    console.log("recived by page:" + e + ", e.data:" + JSON.stringify(e.data));
    if (!!e.data.data.account) {
        userAddrerss = e.data.data.account;
        getOrderHistory();
    }
})

function getOrderHistory(){
    console.log("getOrderHistory!")
    var from = Account.NewAccount().getAddressString();

    var value = "0";
    var nonce = "0"
    var gas_price = "1000000"
    var gas_limit = "2000000"
    var callFunction = "getOrderByUser";
    var callArgs = JSON.stringify([userAddrerss,10]);
    var contract = {
        "function": callFunction,
        "args": callArgs
    }

    neb.api.call(from,dappAddress,value,nonce,gas_price,gas_limit,contract).then(function (resp) {
        cbSearch(resp)
    }).catch(function (err) {
        //cbSearch(err)
        console.log("error:" + err.message)
    })

}


//return of search,
function cbSearch(resp) {
    var result = resp.result    ////resp is an object, resp.result is a JSON string
    console.log("return of rpc call: " + JSON.stringify(result))

    if (result.search("Error") !== -1){
        alert(result);
    } else if(result.search("productName") !== -1){
        alert("recent order history:\n" + JSON.stringify(JSON.parse(result),null,' '))
    }else if(result.search("[]") !== -1){

    }

}
