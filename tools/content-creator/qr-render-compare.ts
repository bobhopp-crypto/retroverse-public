import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";

import { renderQrPngForZone } from "@/lib/ops/creative-lab/qr-zone-render";

const url = "https://retroverse.live";
const size = 783;

async function decode(buf: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(info.width * info.height * 4);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const src = (y * info.width + x) * info.channels;
      const dst = (y * info.width + x) * 4;
      pixels[dst] = data[src] ?? 0;
      pixels[dst + 1] = data[src + 1] ?? 0;
      pixels[dst + 2] = data[src + 2] ?? 0;
      pixels[dst + 3] = 255;
    }
  }
  return jsQR(pixels, info.width, info.height)?.data ?? null;
}

async function main() {
  const svg = await renderQrPngForZone(url, size, 4);
  const lib = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    type: "png",
    width: size,
    margin: 4,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const lib2 = await sharp(lib).png().toBuffer();

  console.log(
    JSON.stringify(
      {
        customSvgPath: await decode(svg.png),
        qrcodeToBuffer: await decode(lib2),
        qrcodeToBufferGrayscale: await decode(await sharp(lib).grayscale().png().toBuffer()),
      },
      null,
      2,
    ),
  );
}

main();
