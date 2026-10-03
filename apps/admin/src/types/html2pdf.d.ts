declare module 'html2pdf.js' {
  type Html2PdfOptions = {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: Record<string, unknown>;
  };
  interface Html2PdfWorker {
    set(opts: Html2PdfOptions): Html2PdfWorker;
    from(el: HTMLElement | string): Html2PdfWorker;
    save(): Promise<void>;
    outputPdf(type?: string): Promise<unknown>;
  }
  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
