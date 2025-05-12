import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { chave: string } }) {
  const chave = params.chave;

  // Placeholder: substituir pelo seu XML real
  const xml = `<?xml version="1.0" encoding="UTF-8"?><nfe><chave>${chave}</chave></nfe>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': `inline; filename="nfe_${chave}.xml"`
    }
  });
}