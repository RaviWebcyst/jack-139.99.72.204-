import { sendTelegramError } from "../../helpers/telegram_helper";
import {
  getTickerPrices,
  getMasterUSDBalance,
  getSlaveUSDBalance,
  getSlaveAssetBalances,
  getSlaves,
} from "../../helpers/binance_helpers";

const { performance } = require("perf_hooks");
export default async function handler(req, res) {
  console.log("api test copier handler");
  let response = {};

  // Run Tests
  let balances = [];
  let arr = [];
  let performance = { slave_times: [] };

  //   populate balances with objects
  let master_start_time = new Date().getTime();
  let start_time = new Date().getTime();
  let slave_length = await getSlaves();
  for (let i in slave_length) {
    balances[i] = {};
  }
  let end_time = new Date().getTime();

  performance.populate_slaves = end_time - start_time;

  // Test precision

  start_time = new Date().getTime();
  let precision = await fetch("https://api.binance.com/api/v3/exchangeInfo");
  precision = await precision.json();
  end_time = new Date().getTime();
  performance.populate_precision = end_time - start_time;

  // Test Copier
  let order = {
    symbol: "ADAUSDT",
    clientOrderId: "web_pYcrrSe1cNPyEMMzhnVk",
    side: "BUY",
    orderType: "MARKET",
    timeInForce: "GTC",
    originalQuantity: "13.2",
    originalPrice: "0",
    averagePrice: "0",
    stopPrice: "0",
    executionType: "NEW",
    orderStatus: "NEW",
    orderId: 1785492911,
    orderLastFilledQuantity: "0",
    orderFilledAccumulatedQuantity: "0",
    lastFilledPrice: "0",
    commissionAsset: undefined,
    commission: undefined,
    orderTradeTime: 1641017593821,
    tradeId: 0,
    bidsNotional: "0",
    askNotional: "0",
    isMakerSide: false,
    isReduceOnly: false,
    stopPriceWorkingType: "CONTRACT_PRICE",
    originalOrderType: "MARKET",
    positionSide: "BOTH",
    closeAll: false,
    activationPrice: undefined,
    callbackRate: undefined,
    realizedProfit: "0",
  }; // ANCHOR: DEBUG DATA

  let data_new = await fetch(
    "https://binance-precision-api.vercel.app/api/data",
    {
      method: "POST",
      body: JSON.stringify({
        order: order,
        slug: process.env.DB_SLUG,
        use: "test",
      }),
    }
  );
  data_new = await data_new.json();

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
    for (let i in slaves) {
      let slave = slaves[i];
      //   let slave_performance = {};
      if (i == "_id") continue;

      let slave_start_time = new Date().getTime();
      if (!slave.active) continue;
      console.log("Slave active");
      if (order.orderType !== "MARKET" && order.orderType !== "LIMIT") continue;
      console.log("Order is not either Market or Limit");
      if (order.orderType == "LIMIT" && order.orderStatus !== "FILLED")
        continue;

      if (order.orderType == "MARKET" && order.orderStatus !== "NEW") continue;

      const MULTIPLIER = slave.multiplier; // TODO - PULL multiplier from database

      // Calculate order quantity
      // Asset == symbol - USDT
      let asset = order.symbol.slice(0, -4);

      let slave_balance = await getSlaveUSDBalance(
        slave.key,
        slave.secret,
        ticker
      );

      let rate = slave_balance / master_balance;

      console.log(`Slave Balance: ` + slave_balance);
      console.log(`Master Balance: ` + master_balance);

      if (slave_balance == 0) rate = 1;

      let qty = rate * order.originalQuantity;
      let data = {
        side: order.side,
        symbol: order.symbol,
        quantity: qty * MULTIPLIER, // Asset balance of slave multiplied by order percentage of master
        name: i,
      };

      console.log(`Data 1:`);
      console.log(data);

      // Dynamically Assign Precision

      // console.log(precision.symbols);
      var results = precision.symbols.filter(function (entry) {
        return entry.symbol === order.symbol;
      });

      // TODO - Manually assign precision for outliers
      /*
         ETH
         XRP
         */

      // Check to make sure balance is valid

      console.log(`Master qty ${data.side} for ${data.name}: ${data.quantity}`);
      console.log(`Master asset: ${asset}`);
      // let slave_assets = await getSlaveAssetBalances(slave.key, slave.secret);
      // for (let y in slave_assets) {
      //   let asset_local = slave_assets[y];
      //   // console.log(`DEBUG: ${asset_local.asset}`);
      //   if (asset_local.asset == asset) {
      //     console.log(
      //       `Available quanity for ${data.name}: ${asset_local.availableBalance}`
      //     );
      //     if (asset_local.availableBalance < data.quantity) {
      //       data.quantity = Math.round(asset_local.availableBalance);
      //     }
      //   }
      // }

      if (data.quantity == 0) data.quantity = order.quantity;

      console.log(`Data 2:`);
      console.log(data);

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
          //   console.log("Dif changed");
          // }
        }
      }

      console.log("Balances: ");
      console.log(balances);

      console.log(`Data 2:`);
      console.log(data);

      // Manually set precision when needed

      let stepSize;

      Number.prototype.countDecimals = function () {
        if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
        return this.toString().split(".")[1].length || 0;
      };

      try {
        let local = data_new[asset];

        let flt = parseFloat(local.minTradeAmt);

        data.quantity = data.quantity.toFixed(flt.countDecimals());
        console.log("parsed api");
      } catch (error) {
        console.log(error);
        // https://www.binance.com/en/support/announcement/6925d618ab6b47e2936cc4614eaad64b
        switch (asset) {
          case "ETC":
            data.quantity = data.quantity.toFixed(2);
            break;

          case "XRP":
            data.quantity = data.quantity.toFixed(1);
            break;
          default:
            try {
              stepSize = results[0].filters[2].stepSize;

              stepSize = parseFloat(stepSize);

              data.quantity = data.quantity.toFixed(stepSize.countDecimals()); // TODO - Test
            } catch (error) {
              data.quantity = Math.round(data.quantity);

              // sendTelegramError(`${data.symbol} precision data not found`);
            }
            break;
        }
      }

      console.log(`Data 3:`);
      console.log(data);

      try {
        // makeSlaveTrade(slave.key, slave.secret, data, copier_status);
        // sendTelegramError(data);
        arr.push(data);
      } catch (error) {
        console.log("TRADE FAILED");
        console.log(error);
        sendTelegramError(error);
      }

      // TODO - Optimize optimize optimize
      let slave_end_time = new Date().getTime();
      performance.slave_times.push(slave_end_time - slave_start_time);
    }
  }

  // Return Results

  response.data = arr;
  response.performance = performance;

  res.status(200).json(response);
}
