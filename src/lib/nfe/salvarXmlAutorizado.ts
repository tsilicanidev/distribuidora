import { supabase } from '../supabase';

export async function salvarXmlAutorizado({
  chave,
  protocolo,
  xml,
}: {
  chave: string;
  protocolo: string;
  xml: string;
}): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { error } = await supabase.from('fiscal_invoices').update({
      xml_url: `/api/nfe/xml/${chave}`,
      pdf_url: `/api/nfe/danfe/${chave}`
    }).eq('number', chave.substring(0, 9));

    if (error) {
      console.error('Erro ao salvar XML:', error.message);
      return { sucesso: false, erro: error.message };
    }

    return { sucesso: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao salvar XML autorizado:', errorMessage);
    return { sucesso: false, erro: errorMessage };
  }
}