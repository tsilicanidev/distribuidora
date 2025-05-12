import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { chave: string } }) {
  const chave = params.chave;

  // Placeholder: substituir pelo seu código real de geração de PDF
  const pdfBuffer = Buffer.from(`PDF gerado para chave: ${chave}`, 'utf-8');

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="danfe_${chave}.pdf"`
    }
  });
}