"use strict";

var OrderItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.index = obj.index;
        this.from = obj.from;
        this.productName = obj.productName;
        this.productModel = obj.productModel;
        this.value = obj.value;
        this.email = obj.email;
    } else {
        this.index = "";
        this.from = "";
        this.productName = "";
        this.productModel = "";
        this.value = "";
        this.email = "";
    }
};

OrderItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var NasShop = function () {

    LocalContractStorage.defineProperties(this, {
        ordersCount:0,
        userCount:0
    });
    // LocalContractStorage.defineMapProperty(this, "ordersMap", {
    //     parse: function (text) {
    //         return new OrderItem(text);
    //     },
    //     stringify: function (o) {
    //         return o.toString();
    //     }
    // });
    LocalContractStorage.defineMapProperty(this, "ownersMap", {});
    LocalContractStorage.defineMapProperty(this, "userIndex", {});
    LocalContractStorage.defineMapProperty(this, "orderIndex", {});
    LocalContractStorage.defineMapProperty(this, "userOrderCount", {});
    LocalContractStorage.defineMapProperty(this, "ordersMap", {});
};

NasShop.prototype = {
    init: function () {
        this.ordersCount = 0;
        this.userCount = 0;
        var owners = ["n1JmhE82GNjdZPNZr6dgUuSfzy2WRwmD9zy","n1GDCCpQ2Z97o9vei2ajq6frrTPyLNCbnt7"];
        this.ownersMap.put("owners",JSON.stringify(owners));
    },

    newOrder: function (orderInfo) {
        orderInfo = JSON.parse(orderInfo);

        if ( orderInfo.productName === "" ||  orderInfo.productName === undefined)
            throw new Error("orderInfo missing product name");
        if ( orderInfo.productModel === "" ||  orderInfo.productModel === undefined)
            throw new Error("orderInfo missing product model");
        if ( orderInfo.email === "" ||  orderInfo.email === undefined)
            throw new Error("orderInfo missing email");

        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value;

        this.ordersCount ++;

        var userOrderNumber = this.userOrderCount.get(from);
        if(!userOrderNumber){
            this.userCount ++;
            this.userIndex.put(this.userCount, from);
            userOrderNumber = 0;
        }
        userOrderNumber ++;
        this.userOrderCount.put(from, userOrderNumber);

        var orderItem = new OrderItem();
        orderItem.index = userOrderNumber;
        orderItem.from = from;
        orderItem.value = value;
        orderItem.productName = orderInfo.productName;
        orderItem.productModel = orderInfo.productModel;
        orderItem.email = orderInfo.email;

        var orderId = from + userOrderNumber;
        this.orderIndex.put(this.ordersCount, orderId);

        this.ordersMap.put(orderId, orderItem);

        return {
            "OrdersIndex": this.ordersCount,
            "UserIndex": this.userCount,
            "UserOrderCounts": userOrderNumber,
            "OrderItems": orderItem
        }
    },

    getOrderCount : function(){
        return this.ordersCount;
    },

    getUserOrderCount: function(user){
        user = user || Blockchain.transaction.from;
        return this.userOrderCount.get(user) || 0;
    },

    //get orders start from {index},
    getOrderByIndex: function (index, number) {
        //this._checkOwner();

        index = index || this.ordersCount;
        number = number || 1;

        if(index > this.ordersCount)
            throw new Error("index bigger that max orders counts!");

        var result = [];
        var end = index+number > this.ordersCount+1 ? this.ordersCount+1 : index+number;

        for(var i = index ; i < end; i++){
            var orderId = this.orderIndex.get(i);
            if(orderId)
                result.push(this.ordersMap.get(orderId));
        }

        return result;
    },

    //get the last x orders of this user
    getOrderByUser: function (user, number) {
        //this._checkOwner();
        user = user || Blockchain.transaction.from;
        number = number || 1;

        var result = [];
        var orderCount = this.userOrderCount.get(user);
        if(!orderCount)
            return result;

        number = number > orderCount ? orderCount : number;

        for (var i = 0; i < number; i++) {
            var orderId = user + (orderCount - i);
            result.push(this.ordersMap.get(orderId));
        }

        return result;
    },

    _checkOwner : function(){
        var from = Blockchain.transaction.from;
        var owners = JSON.parse(this.ownersMap.get("owners"));
        if(!owners.includes(from))
            throw new Error("Have no permission!");
        return true;
    },

    setOwner: function(index,address){
        this._checkOwner();

        if(index > 5){  //5 owners at most
            throw new Error("index larger than 5");
        }

        var owners = JSON.parse(this.ownersMap.get("owners"));

        if(address === "" || address === undefined){   //delete an owner
            if(owners.filter((item) =>{return item.slice(0,1) === "n"}).length <= 1 &&
                owners[index].slice(0,1) === "n"){
                throw new Error("only one owner is left, could not delete!");
            } else {
                owners[index] = address;
                //return "delete owner succeed."
                return {
                    result: "delete owner succeed.",
                    owners: owners.toString()
                }
            }
        }

        if(Blockchain.verifyAddress(address) !== 87)
            throw new Error("invalid account address!");

        owners[index] = address;
        this.ownersMap.put("owners",JSON.stringify(owners));
        // return "set owner: \"" + address + "\" succeed."
        return {
            newOwner: address,
            owners: owners.toString()
        }

    },

    takeout: function(value, address){

        this._checkOwner();

        var from = Blockchain.transaction.from;
        var _address = address || from;
        var _value = value || 0;

        var verify = Blockchain.verifyAddress(_address);
        if(verify !==  87)
            throw new Error("verify result: " + verify + ", invalid account address: " + _address);

        return {
            result: Blockchain.transfer(_address,_value),
            address: _address,
            amount: _value
        };

    },

    getOwners: function () {
        this._checkOwner();
        return JSON.parse(this.ownersMap.get("owners"));

    }

};
module.exports = NasShop;