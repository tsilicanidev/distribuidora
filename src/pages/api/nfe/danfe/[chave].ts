
import { jsPDF } from 'jspdf';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const chave = req.query.chave?.toString() || '00000000000000000000000000000000000000000000';

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('TESTE DE DANFE FUNCIONANDO', 20, 20);
    doc.text(`Chave: ${chave}`, 20, 30);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    console.log('✅ DANFE gerado, enviando PDF...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="danfe_${chave}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Erro ao gerar DANFE:', error);
    res.status(500).json({ error: 'Erro ao gerar DANFE' });
  }
}
