import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { gerarXmlNF, assinarXml } from '@/services/gerarXmlAssinar';
import { emitirNFe } from '@/services/emitirNfe';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ erro: 'orderId obrigatório' });
  }

  // Buscar os dados do pedido de venda no Supabase
  const { data: pedido, error } = await supabase
    .from('sales_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !pedido) {
    return res.status(404).json({ erro: 'Pedido não encontrado' });
  }

  // Gerar chave da NF-e (simplificado para exemplo)
  const chave = `351${pedido.id.toString().padStart(8, '0')}000000000001`;

  try {
    const xmlGerado = gerarXmlNF(chave); // usar dados reais do pedido em versão final
    const xmlAssinado = assinarXml(xmlGerado);

    const resultado = await emitirNFe(xmlAssinado);

    if (resultado.sucesso) {
      return res.status(200).json({ sucesso: true, chave: resultado.chave });
    } else {
      return res.status(500).json({ sucesso: false, resposta: resultado.resposta });
    }
  } catch (e: any) {
    return res.status(500).json({ erro: 'Erro na emissão da NF-e', detalhe: e.message });
  }
}
