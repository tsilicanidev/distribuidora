
import { jsPDF } from 'jspdf';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const doc = new jsPDF();
  doc.text('TESTE PDF DANFE FUNCIONANDO', 20, 20);
  doc.text(`Chave: ${req.query.chave}`, 20, 30);

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="danfe_teste.pdf"');
  res.send(pdfBuffer);
}
