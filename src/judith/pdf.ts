// PDF do documento redigido: logo, texto do documento e rodapé com a data. Enviado como arquivo
// no WhatsApp junto da mensagem de encerramento (orientação da OAB: passar por um advogado).

import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";

// dist/judith/pdf.js → ../../assets (a pasta é copiada na imagem Docker).
const LOGO = path.join(__dirname, "../../assets/judith-logo.jpg");

// Heurística de "documento pronto": a redação entregou o texto final, não uma pergunta de coleta.
export function pareceDocumentoPronto(texto: string): boolean {
  const t = texto.trim();
  if (t.length < 1200) return false;
  if (/\?\s*$/.test(t)) return false;
  return /(CL[ÁA]USULA|CONTRAT(O|ANTE|ADA)|NOTIFICA[ÇC][ÃA]O|DECLARA[ÇC][ÃA]O|PROCURA[ÇC][ÃA]O|EXCELENT[ÍI]SSIMO|TERMO DE|ACORDO|DISTRATO|RECIBO|REQUERIMENTO|PETI[ÇC][ÃA]O|ADVERT[ÊE]NCIA|CARTA DE)/i.test(t);
}

export function tituloDoDocumento(texto: string): string {
  const linha = texto.split("\n").map(l => l.replace(/[#*_`]/g, "").trim()).find(l => l.length >= 4 && l.length <= 90);
  return linha ?? "Documento";
}

export function nomeDoArquivo(titulo: string): string {
  const base = titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 48) || "documento";
  return `${base}-judith.pdf`;
}

// As fontes padrão do PDF (Helvetica) só cobrem Latin-1: emoji e símbolos fora disso saem.
function latin1(texto: string): string {
  return texto.replace(/[^\u0000-ÿ–—‘’“”•…]/g, "");
}

type Trecho = { texto: string; negrito: boolean };
function trechos(linha: string): Trecho[] {
  const partes = linha.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return partes.map(p => (p.startsWith("**") && p.endsWith("**") ? { texto: p.slice(2, -2), negrito: true } : { texto: p, negrito: false }));
}

export async function gerarPdf(texto: string, opts: { titulo?: string; geradoEm?: Date } = {}): Promise<Buffer> {
  const titulo = latin1(opts.titulo ?? tituloDoDocumento(texto));
  const geradoEm = opts.geradoEm ?? new Date();
  const doc = new PDFDocument({ size: "A4", margins: { top: 84, bottom: 72, left: 64, right: 64 }, bufferPages: true, info: { Title: titulo, Author: "JUDITH" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pronto = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });

  const cabecalho = () => {
    // Guarda a fonte em uso: um parágrafo que continua na página seguinte não pode mudar de letra.
    const estado = doc as unknown as { _font?: { name?: string }; _fontSize?: number; _fillColor?: unknown };
    const fonteAtual = estado._font?.name ?? "Helvetica";
    const tamanhoAtual = estado._fontSize ?? 10.5;
    const y = 28;
    if (existsSync(LOGO)) { try { doc.image(LOGO, 64, y, { width: 30, height: 30 }); } catch { /* sem logo */ } }
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#134D3B").text("JUDITH", 102, y + 8, { lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor("#6B7280").text("assistente jurídica e executiva", 160, y + 11, { lineBreak: false });
    doc.moveTo(64, y + 40).lineTo(doc.page.width - 64, y + 40).lineWidth(0.6).strokeColor("#C4623A").stroke();
    doc.font(fonteAtual).fontSize(tamanhoAtual).fillColor("#1F2937");
    doc.x = 64;
    doc.y = 84;
  };
  doc.on("pageAdded", cabecalho);
  cabecalho();

  doc.font("Helvetica-Bold").fontSize(15).fillColor("#134D3B").text(titulo.toUpperCase(), { align: "center" });
  doc.moveDown(0.8);
  doc.fillColor("#1F2937");

  const linhas = texto.split("\n");
  let primeiraLinhaPulada = false;
  for (const bruta of linhas) {
    const linha = latin1(bruta.replace(/\t/g, "  ")).trimEnd();
    if (!primeiraLinhaPulada && linha.replace(/[#*_`]/g, "").trim() === titulo.trim()) { primeiraLinhaPulada = true; continue; }
    if (!linha.trim()) { doc.moveDown(0.6); continue; }
    if (/^#{1,3}\s/.test(linha)) {
      doc.font("Helvetica-Bold").fontSize(12).text(linha.replace(/^#{1,3}\s+/, ""), { align: "left" });
      doc.moveDown(0.3);
      continue;
    }
    const semMarcas = linha.replace(/\*\*/g, "").trim();
    if (semMarcas.length <= 80 && semMarcas === semMarcas.toUpperCase() && /[A-ZÀ-Ú]{3}/.test(semMarcas)) {
      doc.font("Helvetica-Bold").fontSize(11).text(semMarcas, { align: "center" });
      doc.moveDown(0.3);
      continue;
    }
    const item = /^\s*([-*•]|\d+[.)])\s+/.exec(linha);
    const corpo = item ? linha.slice(item[0].length) : linha;
    const prefixo = item ? (/^\d/.test(item[1] ?? "") ? `${item[1]} ` : "• ") : "";
    const partes = trechos(corpo);
    doc.fontSize(10.5);
    if (prefixo) doc.font("Helvetica").text(prefixo, { continued: true, indent: 12 });
    partes.forEach((p, i) => {
      doc.font(p.negrito ? "Helvetica-Bold" : "Helvetica").text(p.texto, { continued: i < partes.length - 1, align: "justify", lineGap: 2 });
    });
    doc.moveDown(0.25);
  }

  // Rodapé em todas as páginas, com numeração.
  const total = doc.bufferedPageRange().count;
  const data = geradoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    // O rodapé fica abaixo da margem inferior; sem zerar a margem, o pdfkit abriria página nova.
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 54;
    doc.moveTo(64, y - 8).lineTo(doc.page.width - 64, y - 8).lineWidth(0.4).strokeColor("#D1D5DB").stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280")
      .text(`Documento gerado pela JUDITH em ${data}. Modelo de referência: deve passar por um advogado antes de ser usado.`, 64, y, { width: doc.page.width - 128 - 60, lineBreak: false })
      .text(`Página ${i + 1} de ${total}`, doc.page.width - 64 - 60, y, { width: 60, align: "right", lineBreak: false });
  }
  doc.end();
  return pronto;
}
