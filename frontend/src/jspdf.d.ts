declare module 'jspdf' {
  export class jsPDF {
    constructor(opts?: {
      orientation?: 'portrait' | 'landscape';
      unit?: string;
      format?: string;
    });
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
    setFillColor(r: number, g: number, b: number): void;
    setTextColor(r: number, g: number, b: number): void;
    setFontSize(size: number): void;
    setFont(name: string, style?: string): void;
    rect(x: number, y: number, w: number, h: number, style: string): void;
    text(text: string, x: number, y: number, opts?: { align?: string }): void;
    addPage(): void;
    setPage(n: number): void;
    getNumberOfPages(): number;
    save(filename: string): void;
  }
}
