import WebSocket, { WebSocketServer } from "ws";
import { sendTelegramError, sendTelegramMaster } from "./telegram_helper";
import { placeWorkerTradeOrder } from "./worker_helper";

// Prelim setup

const Binance = require("node-binance-api");

const binance = new Binance().options({
    APIKEY: process.env.APIKEY,
    APISECRET: process.env.APISECRET,
    useServerTime: true,
});

// global scope
let backlog = {};


export function getDatasv(id) {
    console.log('fsadfds');
}


//get open position single
export async function getOpenPositionSingle(key, secret) {
    let obj = {};
    const sb = new Binance().options({
        APIKEY: key,
        APISECRET: secret,
        useServerTime: true,
        verbose: true,
    });
    obj.slaves = [];

    let ordr = await sb.futuresPositionRisk();

    for (let x in ordr) {
        obj.slaves.push(ordr[x]);
        x++;
    }
    return obj;
}


// Master Helpers
export async function getFuturesBalance() {
    console.log("balance ");
    // Balance start
    return await binance.futuresBalance();
    // Balance stop
}

export async function getOpenFutureOrders() {
    console.log("future balance");
    let obj = {};

    // console.log("new");
    // console.log(await binance.futuresOpenOrders());
    obj.master = await binance.futuresOpenOrders();
    obj.slaves = [];

    let s = await getSlaves();

    // console.log(s);
    let x = 0;
    for (let i in s) {
        // console.log(s[i]);
        const s_b = new Binance().options({
            APIKEY: s[i].key,
            APISECRET: s[i].secret,
            useServerTime: true,
            verbose: true,
        });

        let order = await s_b.futuresOpenOrders();
        // order.name = i;
        // console.log(order);

        if (order.code == "-1021") {
            // console.log(order);
            continue;
        }
        for (let x in order) {
            order[x].name = i;
        }
        // console.log(i);
        obj.slaves.push(order);
        // console.log(typeof order);
        // obj.slaves[x].name = i;
        x++;
    }

    // console.log(obj);

    return obj;
}

export async function getOpenFuturesPositons() {
    console.log("get open recordes helper");
    let obj = {};

    // console.log(await binance.futuresOpenOrders());
    obj.master = await binance.futuresPositionRisk();
    obj.slaves = [];

    let s = await getSlaves();

    // console.log(s);
    let x = 0;
    for (let i in s) {
        // console.log(s[i]);
        const s_b = new Binance().options({
            APIKEY: s[i].key,
            APISECRET: s[i].secret,
            useServerTime: true,
            verbose: true,
        });

        let order = await s_b.futuresPositionRisk();
        // order.name = i;
        // console.log(" slave order");
        // console.log(order);
        if (order.code == "-1021") {
            // console.log(order);
            continue;
        }
        for (let x in order) {
            order[x].name = i;
            order[x].api = s[i].key;
            order[x].secret = s[i].secret;
        }
        // console.log(i);
        obj.slaves.push(order);
        // console.log(typeof order);
        // obj.slaves[x].name = i;
        x++;
    }
    return obj;
}

export async function getMasterAsset(asset_pass) {
    console.log("master asset");
    let list = await binance.futuresBalance();
    let asset;

    for (let i in list) {
        let ass = list[i];
        if (ass.asset == asset_pass) {
            asset = ass;
        }
    }

    return asset;
}

export async function getMasterUSDBalance(ticker) {
    console.log("master usd balance");
    let balance = await binance.futuresBalance();

    let total = 0;

    // let ticker = await getTickerPrices();
    for (let i in balance) {
        let token = balance[i];
        let asset = token.asset + "USDT";

        if (
                token.asset == "USD" ||
                token.asset == "USDT" ||
                token.asset == "USDC" ||
                token.asset == "BUSD"
                ) {
            total += token.balance;
            continue;
        }

        let ticker_price = ticker[asset];
        if (ticker_price == undefined) {
            asset = token.asset + "USDC";
            ticker_price = ticker[asset];
        }

        if (ticker_price == undefined) {
            asset = token.asset + "USD";
            ticker_price = ticker[asset];
        }

        if (ticker_price == undefined) {
            asset = token.asset + "BUSD";
            ticker_price = ticker[asset];
        }

        let amt = token.balance * ticker_price;
        // console.log(amt);
        // total += token.balance * ticker_price;
    }

    return parseFloat(total).toFixed(2);
}

export async function getOpenOrders() {
    console.log("get open orders");
    binance.openOrders(false, (error, openOrders) => {
        console.info("openOrders()", openOrders);
    });
}

export let balances = [];

export async function getTrades() {
    console.log("get trades");
    // populate balances with objects
    let slave_length = await getSlaves();
    for (let i in slave_length) {
        balances[i] = {};
    }

    let precision = await fetch("https://api.binance.com/api/v3/exchangeInfo");
    precision = await precision.json();

    function balance_update(data) {
        console.log("BALANCE UPDATE DEBUG START");
        console.log(data);
        console.log("BALANCE UPDATE DEBUG END");
        console.log("Balance Update");
        for (let obj of data.B) {
            let {a: asset, f: available, l: onOrder} = obj;
            if (available == "0.00000000")
                continue;
            console.log(
                    asset + "\tavailable: " + available + " (" + onOrder + " on order)"
                    );
        }
    }
    function execution_update(data) {
        let {
            x: executionType,
            s: symbol,
            p: price,
            q: quantity,
            S: side,
            o: orderType,
            i: orderId,
            X: orderStatus,
        } = data;
        if (executionType == "NEW") {
            if (orderStatus == "REJECTED") {
                console.log("Order Failed! Reason: " + data.r);
            }
            console.log(
                    symbol +
                    " " +
                    side +
                    " " +
                    orderType +
                    " ORDER #" +
                    orderId +
                    " (" +
                    orderStatus +
                    ")"
                    );

            // console.log("..price: " + price + ", quantity: " + quantity);
            return;
        }
        //NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
        console.log(
                symbol +
                "\t" +
                side +
                " " +
                executionType +
                " " +
                orderType +
                " ORDER #" +
                orderId
                );
    }

    async function orderUpdateHandler(data) {
        console.log("ORDER UPDATE HANDLER START");
        console.log("abc");
        console.log(data);
        slave_length = await getSlaves();
        let slave_data;

        // console.log(data);
        // console.log("ORDER UPDATE HANDLER STOP");

        try {
            await binance.useServerTime();
            if (data.orderStatus == "NEW")
                slave_data = data;
        } catch (e) {
            console.error(e);
        }
        let order = data.order;
        console.log("order response ");
        console.log(order);
        // console.log("order side");
        // console.log(order.side);

        if (order.orderStatus == "NEW" || order.orderStatus == "FILLED") {
            // New order to be placed
            // let slaves = await getSlaves();
            let slaves = slave_length;
            let ticker = await getTickerPrices();
            let master_balance = await getMasterUSDBalance(ticker);
            let copier_status;
            copier_status = await fetch(`${process.env.ROOT_PATH}api/mongo/status`);
            copier_status = await copier_status.json();

            // console.log(order);

            console.log(
                    `Master Trade: ${order.side} ${order.originalQuantity} of ${order.symbol} `
                    );

            let data_new;
            try {
                try {
                    let asset2 = order.symbol.slice(0, -4);
                    let master_usdt = await getMasterAsset("USDT");
                    let master_asset = await getMasterAsset(asset2);
                    master_usdt = master_usdt.availableBalance;
                    master_asset = master_asset.availableBalance;

                    if (order.side == "BUY") {
                        let change = order.originalQuantity * order.originalPrice;
                        master_usdt += change;
                    } else {
                        master_asset += order.originalQuantity;
                    }

                    // Get precision data
                    data_new = await fetch(
                            "https://binance-precision-api.vercel.app/api/data",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    order: order,
                                    slug: process.env.DB_SLUG,
                                    use: "live",
                                    usdt: master_usdt, // TODO - ADD USDT BAL
                                    asset: master_asset,
                                    asset_name: asset2,
                                }),
                            }
                    );
                    data_new = await data_new.json();
                } catch (error) {
                    console.log(error);
                    let asset2 = order.symbol.slice(0, -4);

                    data_new = await fetch(
                            "https://binance-precision-api.vercel.app/api/data",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    order: order,
                                    slug: process.env.DB_SLUG,
                                    use: "live",
                                    usdt: master_balance,
                                    asset: "1000",
                                    asset_name: asset2,
                                }),
                            }
                    );
                    data_new = await data_new.json();
                }
            } catch (error) {
                console.log(error);

                data_new = await fetch(
                        "https://binance-precision-api.vercel.app/api/data"
                        );

                data_new = await data_new.json();
            }




            let precision = {};
            for (let i in slaves) {



                let slave = slaves[i];
                //   let slave_performance = {};
                if (i == "_id")
                    continue;

                // ANCHOR // TODO - AUTOMATE BLOCKS -- FILTER OUT BAD BOIS
                // if (order.symbol == "LTCUSDT" || order.symbol == "VETUSDT") continue;
                // if (order.symbol == "KAVAUSDT" && slave.name == "Ron") continue;

                let slave_start_time = new Date().getTime();
                if (!slave.active)
                    continue;
//                console.log("Slave active");
                if (order.orderType !== "MARKET" && order.orderType !== "LIMIT")
                    continue;
//                console.log("Order is not either Market or Limit");
                if (order.orderType == "LIMIT" && order.orderStatus !== "FILLED")
                    continue;

                if (order.orderType == "MARKET" && order.orderStatus !== "NEW")
                    continue;

                const MULTIPLIER = slave.multiplier; // TODO - PULL multiplier from database

                order.originalQuantity = parseFloat(order.originalQuantity);
                // Calculate order quantity
                // Asset == symbol - USDT
                let asset = order.symbol.slice(0, -4);

                let slave_balance = await getSlaveUSDBalance(
                        slave.key,
                        slave.secret,
                        ticker
                        );

                let rate = slave_balance / master_balance;

//                console.log(`Slave Balance: ` + slave_balance);
//                console.log(`Master Balance: ` + master_balance);

                if (slave_balance == 0)
                    rate = 1;

                let qty = rate * order.originalQuantity;
                let data = {
                    side: order.side,
                    symbol: order.symbol,
                    quantity: qty * MULTIPLIER, // Asset balance of slave multiplied by order percentage of master
                    name: i,
                };

//                console.log(`Data 1:`);
//                console.log(data);

                // Dynamically Assign Precision

                try {
                    // console.log(precision.symbols);
                    var results = precision.symbols.filter(function (entry) {
                        return entry.symbol === order.symbol;
                    });
                } catch (error) {
                }

                // TODO - Manually assign precision for outliers
                /*
                 ETH
                 XRP
                 */

                // Check to make sure balance is valid

//                console.log(
//                        `Master qty ${data.side} for ${data.name}: ${data.quantity}`
//                        );
//                console.log(`Master asset: ${asset}`);

                if (data.quantity == 0)
                    data.quantity = order.quantity;

//                console.log(`Data 2:`);
//                console.log(data);

                // Check again
                if (data.side == "BUY") {
                    if (balances[i].hasOwnProperty(data.symbol)) {
                        balances[i][data.symbol] += data.quantity;
                    } else {
                        balances[i][data.symbol] = data.quantity;
                    }
                } else if (data.side == "SELL") {
                    if (balances[i].hasOwnProperty(data.symbol)) {
                        // balances[i][data.symbol] += data.quantity;

                        if (data.quantity !== balances[i][data.symbol]) {
                            let dif = balances[i][data.symbol] - data.quantity;

                            console.log(
                                    `The difference between order amount and dict is ${dif}`
                                    );
                        }
                        data.quantity = balances[i][data.symbol];
                        balances[i][data.symbol] -= data.quantity;

                        // if ()
                    } else {
                        // if (dif < 0) {
                        //   data.quantity = data.quantity + dif;
                        //   // data.quantity
                        console.log("Dif changed");
                        // }
                    }
                }

//                console.log("Balances: ");
//                console.log(balances);
//
//                console.log(`Data 2:`);
//                console.log(data);

                // Manually set precision when needed

                let stepSize;

                Number.prototype.countDecimals = function () {
                    if (Math.floor(this.valueOf()) === this.valueOf())
                        return 0;
                    return this.toString().split(".")[1].length || 0;
                };


                let pre = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
                pre = await pre.json();
                let symbols = pre.symbols;
                let precision;
                for (let i in symbols) {
                    if (symbols[i].symbol == data.symbol) {
                        precision = symbols[i].quantityPrecision;
                    }
                }

                // try {
                //   let local = data_new[asset];

                //   let flt = parseFloat(local.minTradeAmt);

                //   data.quantity = data.quantity.toFixed(flt.countDecimals());
                //   console.log("parsed api");
                // } catch (error) {
                //   console.log(error);
                //   // https://www.binance.com/en/support/announcement/6925d618ab6b47e2936cc4614eaad64b
                //   switch (asset) {
                //     case "ETC":
                //       data.quantity = data.quantity.toFixed(2);
                //       break;

                //     case "XRP":
                //       data.quantity = data.quantity.toFixed(1);
                //       break;
                //     default:
                //       try {
                //         stepSize = results[0].filters[2].stepSize;

                //         stepSize = parseFloat(stepSize);

                //         data.quantity = data.quantity.toFixed(stepSize.countDecimals()); // TODO - Test
                //       } catch (error) {
                //         data.quantity = Math.round(data.quantity);

                //         // sendTelegramError(`${data.symbol} precision data not found`);
                //       }
                //       break;
                //   }
                // }

//                console.log("precision");
//                console.log(precision);

                data.quantity = data.quantity.toFixed(precision);
                console.log("after precision quantity");
                console.log(data.quantity);
                data.quantity = data.quantity.toString();
                data.quantity = parseFloat(data.quantity);
                console.log(`Data 4:`);
                console.log(data);

                // data.quantity = data.quantity.toFixed(
                //   order.originalQuantity.countDecimals()
                // );


//                console.log('Data 3:qqqqqrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr');

//                console.log(order);
//                console.log('Data 4:qqqqqrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr');
//                console.log('reduceonly:- '+ order.isReduceOnly);
//                console.log('Data 5:qqqqqrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr');

                if (order.isReduceOnly == true) {

//                    console.log('Data 6:solddddddddddddddddddddddddddddddd');
                    let res_pos = await getOpenPositionSingle(slave.key, slave.secret);
                    var arr = res_pos.slaves;

                    var positionAmt;

//                    sendTelegramMaster('positionAmt'.positionAmt);

                    for (let i = 0; i < arr.length; i++) {
                        // console.log("loop working");
                        let dat = arr[i];
                        if (parseFloat(dat.positionAmt) > 0 && dat.symbol == data.symbol) {
                            positionAmt = dat.positionAmt;
                        }
                    }

                    if (positionAmt != undefined) {
                        data.quantity = positionAmt;
                    }

//                    sendTelegramMaster('positionAmt:- '+positionAmt);
                    
//                    console.log('positionAmt:- '+positionAmt);

                }



//                console.log(`Data 5:`);
//                console.log(data);

                try {




                    makeSlaveTrade(slave.key, slave.secret, data, copier_status); // TODO - Add notifications to telegram and dom via this action


                    // if ()
                } catch (error) {
                    console.log("TRADE FAILED");
                    console.log(error);
                    sendTelegramError(error);
                }

                // TODO - Optimize optimize optimize
            }
        }
    }
    binance.websockets.userFutureData(
            balance_update,
            execution_update,
            orderUpdateHandler
            );
    // console.info(await binance.futuresAccount());
    // console.log(binance.websockets);
}

export async function validateApiKey() {
    let res = await binance.withdraw("BTC", "***", 0);

    // console.log(res);
}

export async function terminateBinanceSocket() {
    binance.websockets.terminate();

    try {
        let subs = await binance.futuresSubscriptions();
        console.log(subs);
        for (let i in subs) {
            binance.futuresTerminate(subs[i].endpoint);
        }
    } catch (error) {
        console.log("No sockets");
        sendTelegramError(error);
    }
}

export async function getTickerPrices() {
    return await binance.prices();
}

// Slave Helpers
export async function getSlaves() {
    console.log("get slaves");
    let res = await fetch(`${process.env.ROOT_PATH}api/mongo/slaves`);
    res = await res.json();

    delete res._id;
    return res;
}

export async function getSlaveUSDBalance(key, secret, ticker) {
    console.log("get slave usd balance");
    // console.log("new1");


    // let pre = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    // pre = await pre.json();
    // let symbols = pre.symbols;
    // let precision;
    // for(let i in symbols){
    //   if(symbols[i].symbol == "TRXUSDT"){
    //       precision=symbols[i].quantityPrecision;
    //   }
    // }


    let slave_binance = new Binance().options({
        APIKEY: key,
        APISECRET: secret,
        useServerTime: true,
        recvWindow: 60000,
        // verbose: true,
    });

    let balance = await slave_binance.futuresBalance();

    // console.log(balance);
    let total = 0;

    for (let i in balance) {
        let token = balance[i];
        let asset = token.asset + "USDT";

        if (
                token.asset == "USD" ||
                token.asset == "USDT" ||
                token.asset == "USDC" ||
                token.asset == "BUSD"
                ) {
            total += token.balance;
            continue;
        }

        let ticker_price = ticker[asset];
        if (ticker_price == undefined) {
            asset = token.asset + "USDC";
            ticker_price = ticker[asset];
        }

        if (ticker_price == undefined) {
            asset = token.asset + "USD";
            ticker_price = ticker[asset];
        }

        if (ticker_price == undefined) {
            asset = token.asset + "BUSD";
            ticker_price = ticker[asset];
        }

        let amt = token.balance * ticker_price;
        // console.log(amt);
        // total += token.balance * ticker_price;
    }

    return parseFloat(total).toFixed(2);
}

export async function getSlaveAssetBalances(key, secret) {
    console.log("get slave balance");



    let slave_binance = new Binance().options({
        APIKEY: key,
        APISECRET: secret,
        useServerTime: true,
        recvWindow: 60000,
        verbose: true,
    });

    let balance = await slave_binance.futuresBalance();

    console.log(balance);
    return balance;
}

let orders = 0;

let trades = {};

export async function closeTrade(symbol, id, name) {
    console.log("close trade");

    if (name == "master") {
        await binance.futuresCancel(symbol, {orderId: id}); // TODO - We need to be importing the correct slave based on name
    } else {
        let slave = getSlaveAPICredentials(name);
        let slave_binance = new Binance().options({
            APIKEY: slave.key,
            APISECRET: slave.secret,
            useServerTime: true,
        });
        await slave_binance.futuresCancel(symbol, {orderId: id});
    }
}

export async function makeSlaveTrade(key, secret, data, copier_status) {

    console.log("make slave trades working");
    if (copier_status) {
        let slave_binance = new Binance().options({
            APIKEY: key,
            APISECRET: secret,
            useServerTime: true,
        });

        // Get leverae from master
        let position_data = await binance.futuresPositionRisk({
            symbol: data.symbol,
        });

        await slave_binance.futuresLeverage(data.symbol, position_data[0].leverage); // Set leverage on slave

        if (data.side == "BUY") {
            // Buy
            let debug = await slave_binance.futuresMarketBuy(
                    data.symbol,
                    data.quantity
                    );
            console.log(
                    `New order made: Buy ${data.quantity} of ${data.symbol} for ${data.name}`
                    );
            sendTelegramMaster(
                    `New order made: Buy ${data.quantity} of ${data.symbol} for ${data.name}`
                    );
            // console.log(debug);

            if (debug.msg) {
                sendTelegramError(
                        `Error on purchase for ${data.name} on ${data.symbol} for ${data.quantity}`
                        );
                sendTelegramError(JSON.stringify(debug.msg));
            }
        } else if (data.side == "SELL") {
            // If sell check to see if amount selling is more than amount that you have

            // Sell
            let debug = await slave_binance.futuresMarketSell(
                    data.symbol,
                    data.quantity
                    );
            console.log(
                    `New order made: Sell ${data.quantity} of ${data.symbol} for ${data.name} `
                    );
            sendTelegramMaster(
                    `New order made: Sell ${data.quantity} of ${data.symbol} for ${data.name} `
                    );
            // console.log(debug);

            if (debug.msg) {
                sendTelegramError(
                        `Error on purchase for ${data.name} on ${data.symbol} for ${data.quantity}`
                        );
                sendTelegramError(JSON.stringify(debug.msg));
            }
        }



        // Send Notifications to front end systems
        orders++;
        console.log("Orders placed this copy: " + orders);
        // sendTelegramMaster("Orders placed this instance: " + orders);
    }
}

export async function makeSlaveTrade1(side, key, secret, symbol, quantity, name) {

    console.log("make slave trades new working");
    // if (copier_status) {
    let slave_binance = new Binance().options({
        APIKEY: key,
        APISECRET: secret,
        useServerTime: true,
    });

    // Get leverae from master
    let position_data = await binance.futuresPositionRisk({
        symbol: symbol,
    });

    await slave_binance.futuresLeverage(symbol, position_data[0].leverage); // Set leverage on slave

    if (side == "BUY") {
        // Buy
        let debug = await slave_binance.futuresMarketBuy(
                symbol,
                quantity
                );
        console.log(
                `New order made: Buy ${quantity} of ${symbol} for ${name}`
                );
        sendTelegramMaster(
                `New order made: Buy ${quantity} of ${data.symbol} for ${name}`
                );
        // console.log(debug);

        if (debug.msg) {
            sendTelegramError(
                    `Error on purchase for ${name} on ${symbol} for ${quantity}`
                    );
            sendTelegramError(JSON.stringify(debug.msg));
        }
    } else if (side == "SELL") {
        // If sell check to see if amount selling is more than amount that you have

        // Sell
        let debug = await slave_binance.futuresMarketSell(
                symbol,
                quantity
                );
        console.log(
                `New order made: Sell ${quantity} of ${symbol} for ${name} `
                );
        sendTelegramMaster(
                `New order made: Sell ${quantity} of ${symbol} for ${name} `
                );
        // console.log(debug);

        if (debug.msg) {
            sendTelegramError(
                    `Error on purchase for ${name} on ${symbol} for ${quantity}`
                    );
            sendTelegramError(JSON.stringify(debug.msg));
        }
    }



    // Send Notifications to front end systems
    orders++;
    console.log("Orders placed this copy: " + orders);
    // sendTelegramMaster("Orders placed this instance: " + orders);
    // }
}

export async function getSlaveAPICredentials(name) {
    console.log("api credentials");
    let slaves = await getSlaves();

    return slaves[name];
}

export async function closeOpenOrder(id, side, symbol, quantity, api, secret, name) {
    if (name == "master") {
        console.log("master working");
        if (quantity < 0) {
            quantity = -(+quantity);
        }

        await binance.futuresOrder(side, symbol, quantity);
        // api = process.env.APIKEY;
        // secret = process.env.APISECRET;
        // await binance.makeSlaveTrade1(side,key, secret, symbol,quantity,name);
    } else {
        console.log("id");
        console.log(id);
        // console.log("slave working");
        // console.log("api");
        // console.log(api);
        // console.log("secret");
        // console.log(secret);
        // let slave = getSlaveAPICredentials(name);
        let slave_binance = new Binance().options({
            APIKEY: api,
            APISECRET: secret,
            useServerTime: true,
        });
        if (quantity < 0) {
            quantity = -(+quantity);
        }
        let result = await slave_binance.futuresOrder(side, symbol, quantity);
        //  await binance.makeSlaveTrade1(side,key,secret,symbol,quantity,name);
        //  let result= await slave_binance.futuresCancelAll(symbol);

    }
}

export async function closeSlavePosition(name, symbol) {

    if (name == "master") {
        console.log("master working");
        await binance.futuresCancelAll(symbol);
    } else {
        console.log("slave name");
        console.log(name);
        console.log("slave working");
        let slave = getSlaveAPICredentials(name);
        let slave_binance = new Binance().options({
            APIKEY: slave.key,
            APISECRET: slave.secret,
            useServerTime: true,
        });
        await slave_binance.futuresCancelAll(symbol);
    }
}
// Debug helpers
export async function debugBinance() {
    // let data = await binance.futuresBalance();
    let data = await fetch("https://api.binance.com/api/v3/exchangeInfo");
    data = await data.json();
    console.log(data[0].filters);
    // userData: [Function: userData],
    // userMarginData: [Function: userMarginData],
    // userFutureData: [Function: userFutureData],
    // userDeliveryData: [Function: userDeliveryData],
    // subscribe: [Function: subscribe],
    // subscribeCombined: [Function: subscribeCombined],
    // subscriptions: [Function: subscriptions],
    // terminate: [Function: terminate],
    // clearDepthCache: [Function: clearDepthCache],
    // depthCacheStaggered: [Function: depthCacheStaggered],
    // aggTrades: [Function: trades],
    // trades: [Function: trades],
    // chart: [Function: chart],
    // candlesticks: [Function: candlesticks],
    // miniTicker: [Function: miniTicker],
    // bookTickers: [Function: bookTickerStream],
    // prevDay: [Function: prevDay]
}

export async function getQuantityPrecision() {
    let res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    res = await res.json();
    // let symbols = res.symbols;
    // let precision = [];
    // for(let i in symbols){
    //   if(symbols[i].symbol == symbol){
    //       precision.push(symbols[i].quantityPrecision);
    //   }
    // }
    return res;

}


