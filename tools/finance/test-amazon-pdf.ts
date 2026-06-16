import { readFileSync } from "fs";
import { resolve } from "path";

import { parseAmazonOrderPdf, parseAmazonOrderPdfText } from "../../lib/ops/finance/parsers/amazon-pdf";

async function main() {
  const pdfPath = process.argv[2] ?? "data/finance-imports/8/Your Orders.pdf";
  const buf = readFileSync(resolve(pdfPath));
  console.log("PDF bytes:", buf.length);

  try {
    const orders = await parseAmazonOrderPdf(buf);
    console.log("orders:", orders.length);
    if (!orders.length) {
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const { text } = await pdfParse(buf);
      console.log("raw text sample:\n", text.slice(0, 1500));
      console.log("text parser only:", parseAmazonOrderPdfText(text).length);
    }
    for (const o of orders.slice(0, 5)) {
      console.log({
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        orderTotal: o.orderTotal,
        itemCount: o.items.length,
      });
      for (const item of o.items.slice(0, 3)) {
        console.log("  -", item.description.slice(0, 80), item.amount);
      }
    }
  } catch (e) {
    console.error("ERROR:", e);
    if (e instanceof Error) console.error(e.stack);
    process.exit(1);
  }
}

void main();
