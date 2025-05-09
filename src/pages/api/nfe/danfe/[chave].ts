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

  // For development, we'll generate a simple DANFE without requiring the XML
  // In production, you would fetch the XML from storage and parse it
  
  try {
    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = Readable.from(doc as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=danfe-${chave}.pdf`);

    // Company header
    doc.fontSize(10).text('J&P DISTRIBUIDORA DE ALIMENTOS', { align: 'center' });
    doc.fontSize(8).text('CNPJ: 58.957.775/0001-30', { align: 'center' });
    doc.moveDown(0.5);

    // DANFE title
    doc.fontSize(18).text('DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)', {
      align: 'center', underline: true
    });

    doc.moveDown();
    doc.fontSize(12).text(`Emitente: J&P DISTRIBUIDORA DE ALIMENTOS`);
    doc.text(`CNPJ: 58.957.775/0001-30`);
    doc.text(`Endereço: Rua Vanda, 329 - Parque dos Camargos, Barueri/SP`);

    doc.moveDown();
    doc.fontSize(12).text(`Destinatário: CLIENTE DEMONSTRATIVO`);
    doc.text(`CNPJ: 00.000.000/0000-00`);
    doc.text(`Endereço: Rua Exemplo, 123 - Centro, São Paulo/SP`);

    doc.moveDown();
    doc.text(`Chave de Acesso: ${chave}`, { align: 'left' });
    doc.moveDown();
    doc.text(`Validar na SEFAZ: https://www.nfe.fazenda.gov.br/portal/consulta.aspx`, {
      link: 'https://www.nfe.fazenda.gov.br/portal/consulta.aspx', underline: true
    });

    // Products table
    doc.moveDown();
    doc.fontSize(14).text('Produtos:', { underline: true });
    
    // Sample products
    const products = [
      { name: 'Produto Demonstrativo 1', quantity: 10, unit: 'UN', price: 15.00, total: 150.00 },
      { name: 'Produto Demonstrativo 2', quantity: 5, unit: 'CX', price: 30.00, total: 150.00 },
      { name: 'Produto Demonstrativo 3', quantity: 2, unit: 'KG', price: 25.00, total: 50.00 }
    ];
    
    products.forEach((item, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} x R$ ${item.price.toFixed(2)} = R$ ${item.total.toFixed(2)}`
      );
    });
    
    // Total
    doc.moveDown();
    doc.fontSize(14).text(`Total: R$ ${products.reduce((sum, item) => sum + item.total, 0).toFixed(2)}`, { align: 'right' });

    // QR Code
    const qrUrl = `https://www.nfe.fazenda.gov.br/portal/consulta.aspx?chNFe=${chave}`;
    const qrImage = await QRCode.toDataURL(qrUrl);
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(base64Data, 'base64');

    doc.addPage();
    doc.fontSize(14).text('Consulta rápida via QR Code:', { align: 'center' });
    doc.image(qrBuffer, { width: 150, align: 'center' });
    
    doc.moveDown();
    doc.fontSize(10).text('Este é um DANFE simplificado para fins de demonstração.', { align: 'center' });
    doc.text('Em um ambiente de produção, o DANFE conteria todas as informações fiscais obrigatórias.', { align: 'center' });

    // Signature area
    doc.moveDown(4);
    doc.fontSize(12).text('_______________________________', { align: 'center' });
    doc.fontSize(10).text('Assinatura do Recebedor', { align: 'center' });

    doc.end();
    stream.pipe(res);
  } catch (e: any) {
    return res.status(500).json({ erro: 'Erro ao gerar DANFE detalhada', detalhe: e.message });
  }
}