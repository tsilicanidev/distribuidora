import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { XMLParser } from 'fast-xml-parser';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chave } = req.query;

  if (!chave || typeof chave !== 'string') {
    return res.status(400).json({ erro: 'Chave inválida' });
  }

  const { data, error } = await supabase
    .storage
    .from('nfe-xml')
    .download(`${chave}.xml`);

  if (error || !data) {
    return res.status(404).json({ erro: 'XML não encontrado para esta chave' });
  }

  try {
    const xml = await data.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xml);

    const emit = json.nfeProc.NFe.infNFe.emit;
    const dest = json.nfeProc.NFe.infNFe.dest;
    const produtos = Array.isArray(json.nfeProc.NFe.infNFe.det)
      ? json.nfeProc.NFe.infNFe.det
      : [json.nfeProc.NFe.infNFe.det];

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = Readable.from(doc as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=danfe-${chave}.pdf`);

    doc.fontSize(18).text('DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)', {
      align: 'center', underline: true
    });

    doc.moveDown();
    doc.fontSize(12).text(`Emitente: ${emit.xNome}`);
    doc.text(`CNPJ: ${emit.CNPJ}`);
    doc.text(`Endereço: ${emit.enderEmit.xLgr}, ${emit.enderEmit.nro} - ${emit.enderEmit.xMun}/${emit.enderEmit.UF}`);

    doc.moveDown();
    doc.fontSize(12).text(`Destinatário: ${dest.xNome}`);
    if (dest.CNPJ) doc.text(`CNPJ: ${dest.CNPJ}`);
    if (dest.CPF) doc.text(`CPF: ${dest.CPF}`);
    doc.text(`Endereço: ${dest.enderDest.xLgr}, ${dest.enderDest.nro} - ${dest.enderDest.xMun}/${dest.enderDest.UF}`);

    doc.moveDown();
    doc.text(`Chave de Acesso: ${chave}`, { align: 'left' });
    doc.moveDown();
    doc.text(`Validar na SEFAZ: https://www.nfe.fazenda.gov.br/portal/consulta.aspx`, {
      link: 'https://www.nfe.fazenda.gov.br/portal/consulta.aspx', underline: true
    });
    doc.text(`Baixar XML: https://${req.headers.host}/api/nfe/xml/${chave}`, {
      link: `https://${req.headers.host}/api/nfe/xml/${chave}`, underline: true
    });

    doc.moveDown();
    doc.fontSize(14).text('Produtos:', { underline: true });
    produtos.forEach((item, index) => {
      const prod = item.prod;
      doc.fontSize(12).text(
        `${index + 1}. ${prod.xProd} - ${prod.qCom} ${prod.uCom} x R$ ${Number(prod.vUnCom).toFixed(2)} = R$ ${Number(prod.vProd).toFixed(2)}`
      );
    });

    const qrUrl = `https://www.nfe.fazenda.gov.br/portal/consulta.aspx?chNFe=${chave}`;
    const qrImage = await QRCode.toDataURL(qrUrl);
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(base64Data, 'base64');

    doc.addPage();
    doc.fontSize(14).text('Consulta rápida via QR Code:', { align: 'left' });
    doc.image(qrBuffer, { width: 120, align: 'left' });

    doc.end();
    stream.pipe(res);
  } catch (e: any) {
    return res.status(500).json({ erro: 'Erro ao gerar DANFE detalhada', detalhe: e.message });
  }
}
