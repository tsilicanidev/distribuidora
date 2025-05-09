import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/nfe/xml/[chave]
 * Retorna o XML autorizado da NF-e salvo no Supabase Storage.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chave } = req.query;

  if (!chave || typeof chave !== 'string' || chave.length !== 44) {
    return res.status(400).json({ erro: 'Chave inválida (deve conter 44 dígitos)' });
  }

  try {
    const { data, error } = await supabase
      .storage
      .from('nfe-xml')
      .download(`${chave}.xml`);

    if (error || !data) {
      return res.status(404).json({ erro: 'XML não encontrado para esta chave' });
    }

    const xml = await data.text();
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (err: any) {
    res.status(500).json({ erro: 'Erro ao recuperar XML', detalhe: err.message });
  }
}