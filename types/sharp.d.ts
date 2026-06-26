declare module "sharp" {
  interface SharpChannelStats {
    min: number;
    max: number;
    sum: number;
    squaresSum: number;
    mean: number;
    stdev: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  interface SharpStats {
    channels: SharpChannelStats[];
    isOpaque: boolean;
    entropy: number;
    sharpness: number;
    dominant: { r: number; g: number; b: number };
  }

  interface SharpMetadata {
    width?: number;
    height?: number;
    format?: string;
  }

  interface SharpInstance {
    extract(region: { left: number; top: number; width: number; height: number }): SharpInstance;
    ensureAlpha(): SharpInstance;
    raw(): SharpInstance;
    grayscale(): SharpInstance;
    metadata(): Promise<SharpMetadata>;
    stats(): Promise<SharpStats>;
    resize(
      width: number,
      height: number,
      options?: { kernel?: "nearest" | "lanczos3"; fit?: "inside" | "cover" | "fill" },
    ): SharpInstance;
    composite(
      images: Array<{ input: Buffer | string; left?: number; top?: number }>,
    ): SharpInstance;
    png(): SharpInstance;
    jpeg(options?: { quality?: number }): SharpInstance;
    toBuffer(): Promise<Buffer>;
    toFile(path: string): Promise<{ width: number; height: number }>;
    toBuffer(options: { resolveWithObject: true }): Promise<{
      data: Buffer;
      info: { width: number; height: number; channels: number };
    }>;
  }

  interface SharpKernel {
    nearest: string;
    lanczos3: string;
  }

  interface SharpStatic {
    kernel: SharpKernel;
  }

  const sharp: ((input?: string | Buffer) => SharpInstance) & SharpStatic;
  export default sharp;
}
