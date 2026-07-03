import sharp from "sharp";

export async function renderSvgToPng(svg: string, width = 1200, height = 1200): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

type SharpJoinInput = {
  join: {
    across: number;
    shim: number;
    background: { r: number; g: number; b: number };
  };
};

/** Horizontal montage — five equal panels (sharp join). */
export async function composeMontage(buffers: Buffer[], panelWidth = 480, panelHeight = 480): Promise<Buffer> {
  const panels = await Promise.all(
    buffers.map((buf) => sharp(buf).resize(panelWidth, panelHeight, { fit: "cover" }).png().toBuffer()),
  );

  const joinSharp = sharp as unknown as (
    images: Buffer[],
    options: SharpJoinInput,
  ) => ReturnType<typeof sharp>;

  return joinSharp(panels, {
    join: {
      across: 1,
      shim: 0,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}
