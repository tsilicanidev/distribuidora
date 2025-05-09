import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY!
);

/**
 * Salva o XML autorizado da NF-e no bucket 'nfe-xml' do Supabase Storage.
 * @param chave Chave de acesso da NF-e (formato 44 dígitos)
 * @param xml Conteúdo do XML assinado e autorizado
 * @returns Verdadeiro se o upload for bem-sucedido
 */
export async function salvarXmlAutorizado(chave: string, xml: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('nfe-xml')
      .upload(`${chave}.xml`, new Blob([xml], { type: 'text/xml' }), {
        upsert: true
      });

    if (error) {
      console.error('Erro ao salvar XML no Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Erro inesperado ao salvar XML:', err.message);
    return false;
  }
}