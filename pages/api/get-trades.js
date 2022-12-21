// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { getTrades } from "../../helpers/binance_helpers";

export default function handler(req, res) {
  res.status(200).json({ name: "John Doe" });

  console.log("get trades handler");
  //   getTrades();
}
