"use strict";

var NasShop = function() {

    LocalContractStorage.defineProperties(this, {
        ordersCount: 0,
        shopCount: 0,
        userCount: 0
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
    LocalContractStorage.defineMapProperty(this, "shopMap", {});

    LocalContractStorage.defineProperties(this, {
        _name: null,
        _symbol: null,
        _decimals: null,
        _owner: null,
        _totalSupply: {
            parse: function(value) {
                return new BigNumber(value);
            },
            stringify: function(o) {
                return o.toString(10);
            }
        }
    });

    LocalContractStorage.defineMapProperties(this, {
        "balances": {
            parse: function(value) {
                return new BigNumber(value);
            },
            stringify: function(o) {
                return o.toString(10);
            }
        }
    });
};

NasShop.prototype = {
    init: function() {
        this.ordersCount = 0;
        this.userCount = 0;
        var from = Blockchain.transaction.from;
        var owners = [from, "n1JmhE82GNjdZPNZr6dgUuSfzy2WRwmD9zy", "n1GDCCpQ2Z97o9vei2ajq6frrTPyLNCbnt7"];
        this.ownersMap.put("owners", JSON.stringify(owners));

        this._owner = from;
        this._name = "NasShop";
        this._symbol = "BEEF";
        this._decimals = 18;
        var totalSupply = 1000000000; 
        this._totalSupply = new BigNumber(totalSupply).mul(new BigNumber(10).pow(this._decimals));


        this.balances.set(from, this._totalSupply);
        this.transferEvent(true, from, from, this._totalSupply);
    },

    newOrder: function(orderInfo) {
        orderInfo = JSON.parse(orderInfo);

        if (orderInfo.productName === "" || orderInfo.productName === undefined)
            throw new Error("orderInfo missing product name");
        if (orderInfo.productModel === "" || orderInfo.productModel === undefined)
            throw new Error("orderInfo missing product model");
        if (orderInfo.email === "" || orderInfo.email === undefined)
            throw new Error("orderInfo missing email");

        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value;

        this.ordersCount++;

        var userOrderNumber = this.userOrderCount.get(from);
        if (!userOrderNumber) {
            this.userCount++;
            this.userIndex.put(this.userCount, from);
            userOrderNumber = 0;
        }
        userOrderNumber++;
        this.userOrderCount.put(from, userOrderNumber);

        var orderItem = {};
        orderItem.index = userOrderNumber;
        orderItem.from = from;
        orderItem.value = value;
        orderItem.beefToken = value;
        orderItem.productName = orderInfo.productName;
        orderItem.productModel = orderInfo.productModel;
        orderItem.email = orderInfo.email;

        var orderId = from + userOrderNumber;
        this.orderIndex.put(this.ordersCount, orderId);

        this.ordersMap.put(orderId, orderItem);
        this._reward(from, value);

        return {
            "OrdersIndex": this.ordersCount,
            "UserIndex": this.userCount,
            "UserOrderCounts": userOrderNumber,
            "OrderItems": orderItem
        }
    },

    newShop: function(shopInfo) {
        shopInfo = JSON.parse(shopInfo);

        if (shopInfo.name === "" || shopInfo.name === undefined)
            throw new Error("shopInfo missing shop name");
        if (shopInfo.email === "" || shopInfo.email === undefined)
            throw new Error("shopInfo missing email");
        if (shopInfo.banner === "" || shopInfo.banner === undefined)
            throw new Error("shopInfo missing banner");

        var from = Blockchain.transaction.from;
        //var value = Blockchain.transaction.value;


        var userSHop = this.shopMap.get(from); //One account can only create one shop, and can update it's info
        if (!userSHop) {
            this.shopCount++;
            userSHop = {};
            userSHop.Id = this.shopCount;
        }
        shopInfo.Id = userSHop.Id;

        this.shopMap.put(from, shopInfo);

        return {
            shopCount: this.shopCount,
            shopInfo: shopInfo
        }
    },

    //get the total number of orders
    getOrderCount: function() {
        return this.ordersCount;
    },

    //get the total number of shops
    getShopCount: function() {
        return this.shopCount;
    },

    //get shop info of the owner
    getShopInfo: function(owner) {
        owner = owner || Blockchain.transaction.from;

        return this.shopMap.get(owner);
    },

    //get the total orders number of a user
    getUserOrderCount: function(user) {
        user = user || Blockchain.transaction.from;
        return this.userOrderCount.get(user) || 0;
    },

    //get orders start from {index},
    getOrderByIndex: function(index, number) {
        //this._checkOwner();

        index = index || this.ordersCount;
        number = number || 1;

        if (index > this.ordersCount)
            throw new Error("index bigger that max orders counts!");

        var result = [];
        var end = index + number > this.ordersCount + 1 ? this.ordersCount + 1 : index + number;

        for (var i = index; i < end; i++) {
            var orderId = this.orderIndex.get(i);
            if (orderId)
                result.push(this.ordersMap.get(orderId));
        }

        return result;
    },

    //get the last x orders of this user
    getOrderByUser: function(user, number) {
        //this._checkOwner();
        user = user || Blockchain.transaction.from;
        number = number || 1;

        var result = [];
        var orderCount = this.userOrderCount.get(user);
        if (!orderCount)
            return result;

        number = number > orderCount ? orderCount : number;

        for (var i = 0; i < number; i++) {
            var orderId = user + (orderCount - i);
            result.push(this.ordersMap.get(orderId));
        }

        return result;
    },

    //check if the tx "from" is an owner of this contract
    _checkOwner: function() {
        var from = Blockchain.transaction.from;
        var owners = JSON.parse(this.ownersMap.get("owners"));
        if (!owners.includes(from))
            throw new Error("Have no permission!");
        return true;
    },

    setOwner: function(index, address) {
        this._checkOwner();

        if (index > 5) { //5 owners at most
            throw new Error("index larger than 5");
        }

        var owners = JSON.parse(this.ownersMap.get("owners"));

        if (address === "" || address === undefined) { //delete an owner
            if (owners.filter((item) => {
                    return item.slice(0, 1) === "n"
                }).length <= 1 &&
                owners[index].slice(0, 1) === "n") {
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

        if (Blockchain.verifyAddress(address) !== 87)
            throw new Error("invalid account address!");

        owners[index] = address;
        this.ownersMap.put("owners", JSON.stringify(owners));
        // return "set owner: \"" + address + "\" succeed."
        return {
            newOwner: address,
            owners: owners.toString()
        }

    },

    takeout: function(value, address) {

        this._checkOwner();

        var from = Blockchain.transaction.from;
        address = address || from;
        value = value || 0;

        var verify = Blockchain.verifyAddress(address);
        if (verify !== 87)
            throw new Error("verify result: " + verify + ", invalid account address: " + address);

        return {
            result: Blockchain.transfer(address, value),
            address: address,
            amount: value
        };

    },

    getOwners: function() {
        this._checkOwner();
        return JSON.parse(this.ownersMap.get("owners"));

    },

    // Returns the name of the token
    name: function() {
        return this._name;
    },

    // Returns the symbol of the token
    symbol: function() {
        return this._symbol;
    },

    // Returns the number of decimals the token uses
    decimals: function() {
        return this._decimals;
    },

    totalSupply: function() {
        return this._totalSupply.toString(10);
    },

    balanceOf: function(owner) {
        var balance = this.balances.get(owner);

        if (balance instanceof BigNumber) {
            return balance.toString(10);
        } else {
            return "0";
        }
    },

    _reward: function(to, value) {
        value = new BigNumber(value);
        if (value.lt(0)) {
            throw new Error("invalid value.");
        }

        var from = this._owner;
        var balance = this.balances.get(from) || new BigNumber(0);

        if (balance.lt(value)) {
            throw new Error("transfer failed. value:" + value + " balance:" + balance + " owner:" + this._owner);
        }

        this.balances.set(from, balance.sub(value));
        var toBalance = this.balances.get(to) || new BigNumber(0);
        this.balances.set(to, toBalance.add(value));

        this.transferEvent(true, from, to, value);
    },

    transfer: function(to, value) {
        value = new BigNumber(value);
        if (value.lt(0)) {
            throw new Error("invalid value.");
        }

        var from = Blockchain.transaction.from;
        var balance = this.balances.get(from) || new BigNumber(0);

        if (balance.lt(value)) {
            throw new Error("transfer failed.");
        }

        this.balances.set(from, balance.sub(value));
        var toBalance = this.balances.get(to) || new BigNumber(0);
        this.balances.set(to, toBalance.add(value));

        this.transferEvent(true, from, to, value);
    },

    transferEvent: function(status, from, to, value) {
        Event.Trigger(this.name(), {
            Status: status,
            Transfer: {
                from: from,
                to: to,
                value: value
            }
        });
    }

};
module.exports = NasShop;
