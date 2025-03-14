import axios from 'axios';

interface NFeItem {
  produto: {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  };
  imposto: {
    icms: {
      origem: string;
      cst: string;
      aliquota: number;
      base_calculo: number;
      valor: number;
    };
  };
}

interface NFeData {
  numero: string;
  serie: string;
  natureza_operacao: string;
  tipo_documento: string;
  destino_operacao: string;
  finalidade_emissao: string;
  consumidor_final: string;
  presenca_comprador: string;
  data_emissao: string;
  data_saida: string;
  emitente: {
    cnpj: string;
    inscricao_estadual: string;
    nome: string;
    nome_fantasia: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
      pais: string;
    };
  };
  destinatario: {
    cpf_cnpj: string;
    inscricao_estadual: string;
    nome: string;
    email: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
      pais: string;
    };
  };
  itens: NFeItem[];
  valor_frete: number;
  valor_seguro: number;
  valor_total: number;
  valor_produtos: number;
  valor_desconto: number;
  informacoes_complementares: string;
}

export class NFe {
  private apiUrl: string;
  private ambiente: string;
  private uf: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_SEFAZ_API_URL || 'https://homologacao.nfe.fazenda.sp.gov.br/ws';
    this.ambiente = import.meta.env.VITE_SEFAZ_AMBIENTE || '2'; // 1=Produção, 2=Homologação
    this.uf = import.meta.env.VITE_SEFAZ_UF || 'SP';
  }

  async emitir(data: NFeData): Promise<{
    success: boolean;
    message: string;
    nfe_numero?: string;
    nfe_serie?: string;
    nfe_chave?: string;
    pdf_url?: string;
    xml_url?: string;
  }> {
    try {
      // For now, simulate a successful response
      // This will be replaced with actual SEFAZ integration later
      await new Promise(resolve => setTimeout(resolve, 1000));

      const nfeNumero = data.numero;
      const nfeSerie = data.serie;
      const nfeChave = '35' + new Date().getTime().toString();

      // Generate URLs for documents
      const baseUrl = this.apiUrl.replace('/ws', '');
      const pdfUrl = `${baseUrl}/danfe/${nfeChave}`;
      const xmlUrl = `${baseUrl}/xml/${nfeChave}`;

      return {
        success: true,
        message: 'NF-e emitida com sucesso',
        nfe_numero: nfeNumero,
        nfe_serie: nfeSerie,
        nfe_chave: nfeChave,
        pdf_url: pdfUrl,
        xml_url: xmlUrl
      };
    } catch (error) {
      console.error('Erro ao emitir NF-e:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao emitir NF-e'
      };
    }
  }

  async cancelar(chave: string, justificativa: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Simulate cancellation
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        message: 'NF-e cancelada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao cancelar NF-e:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao cancelar NF-e'
      };
    }
  }

  async inutilizar(
    serie: string,
    numero_inicial: string,
    numero_final: string,
    justificativa: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Simulate number invalidation
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        message: 'Numeração inutilizada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao inutilizar numeração:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao inutilizar numeração'
      };
    }
  }

  async consultarStatus(): Promise<{
    success: boolean;
    message: string;
    online: boolean;
  }> {
    try {
      // Simulate status check
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        message: 'Serviço em Operação',
        online: true
      };
    } catch (error) {
      console.error('Erro ao consultar status do serviço:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Serviço indisponível',
        online: false
      };
    }
  }
}