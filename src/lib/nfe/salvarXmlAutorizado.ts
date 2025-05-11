import { supabase } from '@/lib/supabase';

export async function salvarXmlAutorizado({
  chave,
  protocolo,
  xml,
}: {
  chave: string;
  protocolo: string;
  xml: string;
}): Promise<{ sucesso: boolean; erro?: string }> {
  const { error } = await supabase.from('nfe_autorizadas').insert({
    chave,
    protocolo,
    xml,
  });

  if (error) {
    console.error('Erro ao salvar XML:', error.message);
    return { sucesso: false, erro: error.message };
  }

  return { sucesso: true };
}