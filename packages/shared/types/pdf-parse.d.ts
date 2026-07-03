declare module "pdf-parse" {
  function pdfParse(buffer: Buffer): Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(buffer: Buffer): Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}
