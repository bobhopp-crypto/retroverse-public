import sharp from "sharp";

export async function renderSvgToPng(svg: string, width = 1200, height = 1200): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}
