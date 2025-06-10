
import { emitirNFe } from '@nfewizard-io/node';
import { saveFileToSupabase } from '../supabase-storage'; // adapte conforme sua lógica de storage

export async function processarEmissaoNFe(pedido: any) {
  try {
    const response = await emitirNFe({
      pedido,
      certificadoPfxBase64: process.env.CERT_PFX || '',
      senha: process.env.CERT_PASSWORD || '',
      ambiente: 'homologacao',
    });

    await saveFileToSupabase(pedido.id, response.xml, 'xml');
    await saveFileToSupabase(pedido.id, response.pdf, 'pdf');

    return response;
  } catch (err) {
    console.error('Erro na emissão da NF-e:', err);
    throw err;
  }
}
