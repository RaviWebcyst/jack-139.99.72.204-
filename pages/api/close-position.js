// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { closeSlavePosition, closeTrade ,closeOpenOrder} from "../../helpers/binance_helpers";

export default function handler(req, res) {
  console.log("closeSlavePostion:");
  console.log(req);
  let body = JSON.parse(req.body);
  console.log("body");
  console.log(body);
  // closeSlavePosition(body.name, body.symbol);
  closeOpenOrder(body.id,body.side,body.symbol,body.quantity,body.api,body.secret,body.name);
  res.status(200).json({ name: "John Doe" });
}
