import { handleGetAssign, handlePostAssign } from "../../lib/handlers.js";

export default async function handler(req, res) {
  const voucherCode = req.query.voucherCode;

  if (!voucherCode) {
    res.status(400).send("Missing voucher code");
    return;
  }

  let result;
  if (req.method === "GET") {
    result = await handleGetAssign(voucherCode);
  } else if (req.method === "POST") {
    result = await handlePostAssign(voucherCode, req.body || {});
  } else {
    res.status(405).send("Method not allowed");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(result.status).send(result.html);
}
