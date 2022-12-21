import { useEffect, useState } from "react";
// import { getDatasv } from "./../helpers/binance_helpers";


export default function OpenOrders() {
  let [open, setOpen] = useState(<div className="loader"></div>);
  let [positions, setPositions] = useState(<div className="loader"></div>);

  async function refreshOrder() {
    // Set Open Orders
    console.log("order working");

    let res = await fetch("/api/futures-open-orders");
    res = await res.json();

    
    let res_pos = await fetch("/api/futures-open-positions");
    res_pos = await res_pos.json();

    // let res_pos1 = await fetch(`${process.env.ROOT_PATH}/api/test`);
    // res_pos1= await res_pos1.json();

    // let slav = res_pos1;
    // for (let i in slav.slaves) {
    //   let dat = slav.slaves[i];
    //   if (parseFloat(dat.positionAmt) > 0 ) {
    //     console.log(dat.positionAmt);
    //     sendTelegramMaster("position_amount"+dat.positionAmt);
    //   }
    //   i++;
    // }

    // console.log("res");
    // console.log(res_pos);


    // console.log("all positions"+res_pos);

    // for (let i in res_pos.slaves) {
    //   let slave = res_pos.slaves[i];

    //   for (let j in slave) {
    //     let data = slave[j];
    //     if (parseFloat(data.positionAmt) > 0) {
    //       console.log("positionamt");
    //       console.log(data);
    //       // slave_positions.push(data);
    //     }
    //   }
    // }

    // console.log("Open Orders:");
    // console.log(res);

    let arr = [];

    // Orders
    // set master orders
    for (let i in res.master) {
      let order = res.master[i];

      async function closeTrade(e) {
        // console.log("working click");
        e.preventDefault();
        // console.log("working click");
        // console.log(e.target.id);

        masterCloseOrder(order.symbol, order.orderId, e.target.name);
      }

      arr.push(
        <tr id={i + "_open_order"} key={i + "_open_order"}>
          <td>Master</td>
          <td>{order.symbol}</td>
          <td>{order.side}</td>
          {/* <td>{order.stopPrice}</td> */}
          <td>{order.type}</td>
          {/* <td>{order.origQty}</td> */}
          <td>
            <input
              name="master"
              type="button"
              value="Close Trade"
              onClick={closeTrade}
            />{" "}
          </td>
        </tr>
      );
    }

    // set slaves orders
    for (let i in res.slaves) {
      let a = res.slaves[i];

      for (let x in a) {
        let order = a[x];

        async function closeTrade(e) {
          e.preventDefault();
          // console.log(e.target.name);
          masterCloseOrder(order.symbol, order.orderId, e.target.name);
        }
        arr.push(
          <tr>
            <td>{order.name}</td>
            <td>{order.symbol}</td>
            <td>{order.side}</td>
            {/* <td>{order.stopPrice}</td> */}
            <td>{order.type}</td>
            {/* <td>{order.origQty}</td> */}
            <td>
              <input
                name={order.name}
                type="button"
                value="Close Trade"
                onClick={closeTrade}
              />{" "}
            </td>
          </tr>
        );
      }
    }

    setOpen(arr);

    // Positions

    let master_positions = [];
    let slave_positions = [];
    for (let i in res_pos.master) {
      let chunk = res_pos.master[i];

      if (parseFloat(chunk.positionAmt) != 0) {
        master_positions.push(chunk);
      }
    }
    for (let i in res_pos.slaves) {
      let slave = res_pos.slaves[i];
      // slave_positions[i] = [];

      for (let x in slave) {
        let chunk = slave[x];
        if (parseFloat(chunk.positionAmt) != 0) {
          slave_positions.push(chunk);
        }
      }
    }


    let arr2 = [];
    for (let i in master_positions) {
      let order = master_positions[i];
      // localStorage.setItem("master_"+i,order);
      localStorage.setItem("master_id_"+i,i);
      localStorage.setItem("master_symbol_"+i,order.symbol);
      localStorage.setItem("master_pmt_"+i,order.positionAmt);
      localStorage.setItem("master_api_"+i,order.api);
      localStorage.setItem("master_secret_"+i,order.secret);
      // let
      arr2.push(
        <tr id={i + "_open_position"} key={i + "_open_position"}>
          <td>Master</td>
          <td>{order.symbol}</td>
          <td>{order.positionAmt >0 ?"Buy" : "Sell"}</td>

          <td>{order.unRealizedProfit}</td>
          <td>
            <input
              value={"Close Position"}
              type={"button"}
              id={i+"mid"}
              onClick={() => {
                // masterClosePosition("master_"+i,"master");
                masterClosePosition("master_id_"+i,"master_symbol_"+i,"master_secret_"+i,"master_api_"+i,"master_pmt_"+i,"master"); 

              }
              }
            ></input>
          </td>
        </tr>
      );
    }

    for (let i in slave_positions) {
      let order = slave_positions[i];
      // localStorage.setItem("slave_"+i,order);
      localStorage.setItem("slave_id_"+i,i);
      localStorage.setItem("slave_symbol_"+i,order.symbol);
      localStorage.setItem("slave_pmt_"+i,order.positionAmt);
      localStorage.setItem("slave_api_"+i,order.api);
      localStorage.setItem("slave_secret_"+i,order.secret);
      // console.log("order");
      // console.log(order);
      arr2.push(
        <tr id={i + "_open_slave_position"} key={i + "_open_slave_position"}>
          <td>{order.name}</td>
          <td>{order.symbol}</td>
          <td>{order.positionAmt >0 ?"Buy" : "Sell"}</td>
          <td>{order.unRealizedProfit}</td>
          <td>
            <input
              value={"Close Position"}
              type={"button"}
              id={i+"bid"}
              onClick={() => 
               { 
                //  masterClosePosition("slave_"+i,order.name); 
                 masterClosePosition("slave_id_"+i,"slave_symbol_"+i,"slave_secret_"+i,"slave_api_"+i,"slave_pmt_"+i,order.name); 
                
                }
              }
            ></input>
          </td>
        </tr>
      );
    }

    // console.log(master_positions);
    // console.log(slave_positions);
    setPositions(arr2);
  }

  function refreshPage() {}
  useEffect(() => {
    (async () => {
      refreshOrder();
    })();
    let timer;

    timer = setInterval(async () => {
      // console.log("This will run after 10 second!");
      refreshOrder();
    }, 15000);
    return () => clearTimeout(timer);
  }, 
  []);
  return (
    <div className="w3-container w3-center w3-border">
      {/* <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      /> */}

      <h1 className="w3-center">Open Orders</h1>
      {/* <div
        class="fa fa-refresh"
        style="font-size:36px;"
        onClick={refreshOrder}
      ></div> */}

      <table className="w3-table w3-hoverable w3-centered w3-border w3-bordered">
        <thead>
          <tr>
            <th>Account</th>
            <th>Symbol</th>
            <th>Side</th>
            {/* <th>Price</th> */}
            <th>Type</th>
            {/* <th>Qty</th> */}
            <th>Close</th>
          </tr>
        </thead>
        <tbody>{open}</tbody>
      </table>

      <h1 className="w3-center">Open Positions</h1>

      <table className="w3-table w3-hoverable w3-centered w3-border w3-bordered">
        <thead>
          <tr>
            <th>Account</th>
            <th>Symbol</th>
            <th>Side</th>
         
            <th>Profit</th>
            <th>Close</th>
          </tr>
        </thead>
        <tbody>{positions}</tbody>
      </table>
    </div>
  );
}

// avgPrice: "0"
// clientOrderId: "web_dILRzVkXrGASK2ZwHGei"
// closePosition: true
// cumQuote: "0"
// executedQty: "0"
// orderId: 1804777211
// origQty: "0"
// origType: "TAKE_PROFIT_MARKET"
// positionSide: "BOTH"
// price: "0"
// priceProtect: false
// reduceOnly: true
// side: "SELL"
// status: "NEW"
// stopPrice: "0.8522"
// symbol: "CHRUSDT"
// time: 1641185338115
// timeInForce: "GTE_GTC"
// type: "TAKE_PROFIT_MARKET"
// updateTime: 1641185338115
// workingType: "MARK_PRICE"
// [[Prototype]]: Object

async function masterCloseOrder(symbol, id) {
  if (confirm("Are you sure you want to delete the order 2222?")) {
    await fetch("/api/close-trade", {
      method: "POST",
      body: JSON.stringify({
        symbol: symbol,
        id: id,
      }),
    });
  } else {
    console.log("Dont do it!");
  }
}

async function masterClosePosition(id,symbol,secret,api,quantiy,name) {
  
  if (confirm("Are you sure you want to delete the order?")) {
    console.log("name");
    console.log(name);
    
    let idd = localStorage.getItem(id);
    console.log("id");
    console.log(idd);
    // console.log(localStorage.getItem(i));
    let sym = localStorage.getItem(symbol);
    console.log("symbol");
    console.log(sym);
    let sec = localStorage.getItem(secret);
    console.log("secret");
    console.log(sec);
    let apii = localStorage.getItem(api);
    console.log("api");
    console.log(apii);
    let pmt = localStorage.getItem(quantiy);
    console.log("quantity");
    console.log(pmt);
    

    localStorage.removeItem(id);
    localStorage.removeItem(symbol);
    localStorage.removeItem(secret);
    localStorage.removeItem(api);
    localStorage.removeItem(quantiy);

    let side = pmt >0 ?"SELL":"BUY";
    await fetch("/api/close-position", {
      method: "POST",
      body: JSON.stringify({
        side:side,
        api:apii,
        secret:sec,
        symbol: sym,
        quantity:pmt,
        name: name,
        id:idd
      }),
    });
  } else {
    console.log("Dont do it!");
  }

}
