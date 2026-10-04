export async function downloadPdf(el: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    onclone: (doc) => {
      doc.querySelectorAll<HTMLElement>("[data-scale-wrap]").forEach((w) => {
        w.style.transform = "none";
      });
      const a = doc.getElementById("print-area");
      if (a) a.style.boxShadow = "none";
    },
  });
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const pxPerMm = canvas.width / pageW;
  const pagePx = Math.floor(pageH * pxPerMm);
  let y = 0;
  let first = true;
  while (y < canvas.height - 2) {
    const h = Math.min(pagePx, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, slice.width, h);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, h / pxPerMm);
    first = false;
    y += pagePx;
  }
  pdf.save(filename);
}
