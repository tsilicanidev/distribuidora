import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { XMLParser } from 'fast-xml-parser';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chave } = req.query;

  if (!chave || typeof chave !== 'string') {
    return res.status(400).json({ erro: 'Chave inválida' });
  }

  try {
    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = Readable.from(doc as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=danfe-${chave}.pdf`);

    // Company header
    doc.image('src/assets/logo-jp.png', 50, 50, { width: 100 })
      .fontSize(18).text('J&P DISTRIBUIDORA DE ALIMENTOS', 160, 65)
      .fontSize(10).text('CNPJ: 58.957.775/0001-30', 160, 85)
      .text('IE: 398260490115', 160, 100)
      .text('Rua Vanda, 329 - Parque dos Camargos, Barueri/SP - CEP: 06436-380', 160, 115);

    // DANFE title and box
    doc.rect(50, 140, 500, 80).stroke();
    doc.fontSize(16).text('DANFE', 270, 150);
    doc.fontSize(12).text('Documento Auxiliar da Nota Fiscal Eletrônica', 180, 170);
    doc.fontSize(10).text('0 - ENTRADA', 70, 190);
    doc.fontSize(10).text('1 - SAÍDA', 70, 205);
    doc.rect(150, 190, 15, 15).stroke();
    doc.text('X', 155, 192);
    
    doc.fontSize(10).text('Nº NF-e: 000001', 300, 190);
    doc.fontSize(10).text('SÉRIE: 001', 300, 205);
    
    // Access key
    doc.rect(50, 230, 500, 40).stroke();
    doc.fontSize(10).text('CHAVE DE ACESSO', 60, 240);
    doc.fontSize(11).text(chave, 60, 255);
    
    // Recipient information
    doc.rect(50, 280, 500, 100).stroke();
    doc.fontSize(12).text('DESTINATÁRIO / REMETENTE', 60, 290);
    doc.fontSize(10).text('NOME / RAZÃO SOCIAL:', 60, 310);
    doc.text('CLIENTE DEMONSTRATIVO', 200, 310);
    doc.fontSize(10).text('CNPJ / CPF:', 60, 330);
    doc.text('00.000.000/0000-00', 200, 330);
    doc.fontSize(10).text('ENDEREÇO:', 60, 350);
    doc.text('Rua Exemplo, 123 - Centro, São Paulo/SP', 200, 350);
    
    // Products table header
    doc.rect(50, 390, 500, 30).stroke();
    doc.fontSize(12).text('DADOS DOS PRODUTOS / SERVIÇOS', 220, 400);
    
    // Table headers
    const tableTop = 430;
    doc.rect(50, tableTop, 500, 25).stroke();
    doc.fontSize(8)
      .text('CÓDIGO', 55, tableTop + 10)
      .text('DESCRIÇÃO', 110, tableTop + 10)
      .text('NCM/SH', 250, tableTop + 10)
      .text('QTDE', 300, tableTop + 10)
      .text('UN', 340, tableTop + 10)
      .text('VL.UNIT', 370, tableTop + 10)
      .text('VL.TOTAL', 430, tableTop + 10)
      .text('ICMS', 490, tableTop + 10);
    
    // Sample products
    const products = [
      { code: '001', name: 'PRODUTO DEMONSTRATIVO 1', ncm: '22021000', quantity: 10, unit: 'UN', price: 15.00, total: 150.00 },
      { code: '002', name: 'PRODUTO DEMONSTRATIVO 2', ncm: '22021000', quantity: 5, unit: 'CX', price: 30.00, total: 150.00 },
      { code: '003', name: 'PRODUTO DEMONSTRATIVO 3', ncm: '22021000', quantity: 2, unit: 'KG', price: 25.00, total: 50.00 }
    ];
    
    let y = tableTop + 25;
    products.forEach((item, index) => {
      doc.rect(50, y, 500, 25).stroke();
      doc.fontSize(8)
        .text(item.code, 55, y + 10)
        .text(item.name, 110, y + 10)
        .text(item.ncm, 250, y + 10)
        .text(item.quantity.toString(), 300, y + 10)
        .text(item.unit, 340, y + 10)
        .text(item.price.toFixed(2), 370, y + 10)
        .text(item.total.toFixed(2), 430, y + 10)
        .text('SIMPLES', 490, y + 10);
      y += 25;
    });
    
    // Total
    doc.rect(50, y, 500, 30).stroke();
    doc.fontSize(10).text('VALOR TOTAL DA NOTA:', 300, y + 10);
    doc.fontSize(12).text(`R$ ${products.reduce((sum, item) => sum + item.total, 0).toFixed(2)}`, 430, y + 10);
    
    // Additional information
    y += 40;
    doc.rect(50, y, 500, 60).stroke();
    doc.fontSize(10).text('INFORMAÇÕES COMPLEMENTARES:', 60, y + 10);
    doc.fontSize(8).text('Documento emitido por ME ou EPP optante pelo Simples Nacional.', 60, y + 30);
    doc.fontSize(8).text('Não gera direito a crédito fiscal de IPI.', 60, y + 45);
    
    // QR Code
    const qrUrl = `https://www.nfe.fazenda.gov.br/portal/consulta.aspx?chNFe=${chave}`;
    const qrImage = await QRCode.toDataURL(qrUrl);
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(base64Data, 'base64');
    
    doc.addPage();
    doc.fontSize(14).text('Consulta rápida via QR Code:', { align: 'center' });
    doc.image(qrBuffer, { width: 150, align: 'center' });
    
    doc.moveDown(2);
    doc.fontSize(12).text('Consulta de autenticidade no portal nacional da NF-e', { align: 'center' });
    doc.fontSize(10).text('www.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizadora', { align: 'center' });
    
    // Signature area
    doc.moveDown(4);
    doc.fontSize(12).text('_______________________________', { align: 'center' });
    doc.fontSize(10).text('Assinatura do Recebedor', { align: 'center' });
    
    // Date and time
    doc.moveDown();
    doc.fontSize(10).text(`Data de Recebimento: ___/___/______`, { align: 'center' });
    
    doc.end();
    stream.pipe(res);
  } catch (e: any) {
    return res.status(500).json({ erro: 'Erro ao gerar DANFE detalhada', detalhe: e.message });
  }
}