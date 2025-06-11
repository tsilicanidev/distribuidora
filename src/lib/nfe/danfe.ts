
import { gerarDanfePDF } from '@nfewizard-io/node';

/**
 * Gera um PDF da DANFE a partir do XML da NFe.
 * @param xml XML da NFe em string.
 * @returns Buffer com o conteúdo do PDF gerado.
 */
export async function gerarDanfe(xml: string): Promise<Buffer> {
  try {
    const pdfBuffer = await gerarDanfePDF(xml);
    return pdfBuffer;
  } catch (error) {
    console.error('Erro ao gerar DANFE:', error);
    throw error;
  }
}
