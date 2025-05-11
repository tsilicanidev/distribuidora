import axios from 'axios';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from 'xmldom';

// Configurações do ambiente
const SEFAZ_API_URL = import.meta.env.VITE_SEFAZ_API_URL!;
const AMBIENTE = import.meta.env.VITE_SEFAZ_AMBIENTE || '2'; // 1=Produção, 2=Homologação
const UF = import.meta.env.VITE_SEFAZ_UF || 'SP';
const CERTIFICADO_BASE64 = import.meta.env.VITE_CERTIFICADO_BASE64!;
const CERTIFICADO_SENHA = import.meta.env.VITE_CERTIFICADO_SENHA!;
const CNPJ_EMPRESA = import.meta.env.VITE_EMPRESA_CNPJ || '58957775000130';

// Classe para gerenciar o certificado digital
class CertificadoDigital {
  private certificado: any;
  private chavePrivada: any;

  constructor(CERTIFICADO_BASE64: string, senha: string) {
    try {
      // Em um ambiente real, o certificado seria lido do sistema de arquivos
      // Como estamos no browser, vamos simular o certificado
      this.simularCertificado(senha);
    } catch (error) {
      console.error('Erro ao carregar certificado:', error);
      throw new Error('Falha ao carregar certificado digital');
    }
  }

  // Método para simular a leitura do certificado
  private simularCertificado(senha: string) {
    // Em um ambiente real, isso seria feito com o certificado real
    // Aqui estamos apenas simulando para fins de demonstração
    this.certificado = {
      cert: 'CERTIFICADO_SIMULADO',
      key: 'CHAVE_PRIVADA_SIMULADA'
    };
    this.chavePrivada = 'CHAVE_PRIVADA_SIMULADA';
  }

  // Método para obter o certificado
  public getCertificado() {
    return this.certificado.cert;
  }

  // Método para obter a chave privada
  public getChavePrivada() {
    return this.chavePrivada;
  }
}

// Classe para assinar XML
class AssinadorXML {
  private certificado: CertificadoDigital;

  constructor(certificado: CertificadoDigital) {
    this.certificado = certificado;
  }

  // Método para assinar o XML
  public assinar(xml: string, referenceUri: string): string {
    try {
      // Criar o documento XML
      const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
      
      // Configurar o assinador
      const sig = new SignedXml();
      sig.addReference(referenceUri);
      sig.signingKey = this.certificado.getChavePrivada();
      
      // Adicionar o certificado
      sig.keyInfoProvider = {
        getKeyInfo: () => {
          return `<X509Data><X509Certificate>${this.certificado.getCertificado()}</X509Certificate></X509Data>`;
        }
      };
      
      // Assinar o XML
      sig.computeSignature(xml);
      
      // Retornar o XML assinado
      return sig.getSignedXml();
    } catch (error) {
      console.error('Erro ao assinar XML:', error);
      throw new Error('Falha ao assinar XML');
    }
  }
}

// Função para criar o envelope SOAP
function criarEnvelopeSOAP(conteudo: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <cUF>${UF === 'SP' ? '35' : '00'}</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      ${conteudo}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

// Função para criar o lote de NFe
function criarLoteNFe(xmlNFe: string): string {
  const idLote = new Date().getTime().toString();
  
  return `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>${idLote}</idLote>
  <indSinc>1</indSinc>
  ${xmlNFe}
</enviNFe>`;
}

// Função para transmitir a NFe para a SEFAZ
export async function transmitirNFe(xmlNFe: string, chave: string): Promise<{ 
  sucesso: boolean; 
  protocolo?: string; 
  mensagem?: string; 
  chave?: string;
  xml?: string;
}> {
  try {
    if (!chave || chave.length !== 44) {
      throw new Error('Chave da NFe inválida ou ausente');
    }
    
    // Carregar o certificado digital
    const certificado = new CertificadoDigital(CERTIFICADO_BASE64, CERTIFICADO_SENHA);


    const matches = xmlSanitizado.match(/#(?!NFe\d{44})/g);
if (matches) {
  console.warn('⚠️ Ainda existem ocorrências de # indevidas:', matches);
}
    
    
    // Assinar o XML
    function sanitizeXmlBeforeSign(xml: string, idRef: string): string {
  const ref = idRef.replace(/^#/, '');
  
  // Expressão para substituir todos os '#' que NÃO fazem parte de idRef ou URI="#..."
  return xml.replace(/#(?!NFe\d{44})/g, '&#35;');
}
    const idRef = `#NFe${chave}`;
    const xmlSanitizado = sanitizeXmlBeforeSign(xmlNFe, idRef);
    const assinador = new AssinadorXML(certificado);
    const xmlAssinado = assinador.assinar(xmlSanitizado, idRef);
    
    // Criar o lote de NFe
    const loteNFe = criarLoteNFe(xmlAssinado);
    
    // Criar o envelope SOAP
    const envelopeSOAP = criarEnvelopeSOAP(loteNFe);
    
    // Configurar os headers da requisição
    const headers = {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote'
    };
    
    // Em um ambiente real, enviaria a requisição para a SEFAZ
    // Como estamos em ambiente de desenvolvimento, vamos simular a resposta
    
    // Simular a resposta da SEFAZ
    const protocolo = Math.floor(Math.random() * 1000000000).toString().padStart(15, '0');
    const dataRecebimento = new Date().toISOString();
    
    // XML de resposta simulado
    const xmlResposta = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  ${xmlAssinado}
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${AMBIENTE}</tpAmb>
      <verAplic>SP_NFE_PL_008i2</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dataRecebimento}</dhRecbto>
      <nProt>${protocolo}</nProt>
      <digVal>DIGEST_VALUE_SIMULADO</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
    
    // Em um ambiente real, a resposta seria processada a partir do retorno da SEFAZ
    // Aqui estamos apenas simulando uma resposta bem-sucedida
    
    return {
      sucesso: true,
      protocolo,
      mensagem: 'Autorizado o uso da NF-e',
      chave,
      xml: xmlResposta
    };
    
    /* 
    // Código para ambiente real com SEFAZ
    const response = await axios.post(SEFAZ_API_URL, envelopeSOAP, { headers });
    
    // Processar a resposta
    const responseXml = response.data;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseXml, 'text/xml');
    
    // Extrair informações da resposta
    const cStat = xmlDoc.getElementsByTagName('cStat')[0]?.textContent;
    const xMotivo = xmlDoc.getElementsByTagName('xMotivo')[0]?.textContent;
    const nProt = xmlDoc.getElementsByTagName('nProt')[0]?.textContent;
    
    if (cStat === '100') {
      // Autorizado
      return {
        sucesso: true,
        protocolo: nProt,
        mensagem: xMotivo,
        chave,
        xml: responseXml
      };
    } else {
      // Rejeitado
      return {
        sucesso: false,
        mensagem: `${cStat} - ${xMotivo}`
      };
    }
    */
  } catch (error) {
    console.error('Erro ao transmitir NFe:', error);
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao transmitir NFe'
    };
  }
}

// Função para consultar o status da NFe
export async function consultarNFe(chave: string): Promise<{
  sucesso: boolean;
  status?: string;
  mensagem?: string;
  protocolo?: string;
}> {
  try {
    // Em um ambiente real, enviaria uma consulta para a SEFAZ
    // Como estamos em ambiente de desenvolvimento, vamos simular a resposta
    
    return {
      sucesso: true,
      status: '100',
      mensagem: 'Autorizado o uso da NF-e',
      protocolo: Math.floor(Math.random() * 1000000000).toString().padStart(15, '0')
    };
    
    /*
    // Código para ambiente real com SEFAZ
    // Carregar o certificado digital
    const certificado = new CertificadoDigital(CERTIFICADO_BASE64, CERTIFICADO_SENHA);
    
    // Criar o XML de consulta
    const xmlConsulta = `
      <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${AMBIENTE}</tpAmb>
        <xServ>CONSULTAR</xServ>
        <chNFe>${chave}</chNFe>
      </consSitNFe>
    `;
    
    // Criar o envelope SOAP
    const envelopeSOAP = criarEnvelopeSOAP(xmlConsulta);
    
    // Configurar os headers da requisição
    const headers = {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF'
    };
    
    // Enviar a requisição
    const response = await axios.post(
      'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      envelopeSOAP,
      { headers }
    );
    
    // Processar a resposta
    const responseXml = response.data;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseXml, 'text/xml');
    
    // Extrair informações da resposta
    const cStat = xmlDoc.getElementsByTagName('cStat')[0]?.textContent;
    const xMotivo = xmlDoc.getElementsByTagName('xMotivo')[0]?.textContent;
    const nProt = xmlDoc.getElementsByTagName('nProt')[0]?.textContent;
    
    return {
      sucesso: true,
      status: cStat,
      mensagem: xMotivo,
      protocolo: nProt
    };
    */
  } catch (error) {
    console.error('Erro ao consultar NFe:', error);
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao consultar NFe'
    };
  }
}

// Função para cancelar a NFe
export async function cancelarNFe(chave: string, justificativa: string): Promise<{
  sucesso: boolean;
  protocolo?: string;
  mensagem?: string;
}> {
  try {
    // Validar a justificativa
    if (!justificativa || justificativa.length < 15 || justificativa.length > 255) {
      throw new Error('A justificativa deve ter entre 15 e 255 caracteres');
    }
    
    // Em um ambiente real, enviaria uma requisição de cancelamento para a SEFAZ
    // Como estamos em ambiente de desenvolvimento, vamos simular a resposta
    
    return {
      sucesso: true,
      protocolo: Math.floor(Math.random() * 1000000000).toString().padStart(15, '0'),
      mensagem: 'Evento registrado e vinculado a NF-e'
    };
    
    /*
    // Código para ambiente real com SEFAZ
    // Carregar o certificado digital
    const certificado = new CertificadoDigital(CERTIFICADO_BASE64, CERTIFICADO_SENHA);
    
    // Criar o XML de cancelamento
    const idEvento = `ID${chave}01`;
    const dataEvento = new Date().toISOString();
    const nSeqEvento = '1';
    
    const xmlCancelamento = `
      <envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
        <idLote>1</idLote>
        <evento versao="1.00">
          <infEvento Id="${idEvento}">
            <cOrgao>${UF === 'SP' ? '35' : '00'}</cOrgao>
            <tpAmb>${AMBIENTE}</tpAmb>
            <CNPJ>${CNPJ_EMPRESA}</CNPJ>
            <chNFe>${chave}</chNFe>
            <dhEvento>${dataEvento}</dhEvento>
            <tpEvento>110111</tpEvento>
            <nSeqEvento>${nSeqEvento}</nSeqEvento>
            <verEvento>1.00</verEvento>
            <detEvento versao="1.00">
              <descEvento>Cancelamento</descEvento>
              <nProt>${protocolo}</nProt>
              <xJust>${justificativa}</xJust>
            </detEvento>
          </infEvento>
        </evento>
      </envEvento>
    `;
    
    // Assinar o XML
    const assinador = new AssinadorXML(certificado);
    const xmlAssinado = assinador.assinar(xmlCancelamento, `#${idEvento}`);
    
    // Criar o envelope SOAP
    const envelopeSOAP = criarEnvelopeSOAP(xmlAssinado);
    
    // Configurar os headers da requisição
    const headers = {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento'
    };
    
    // Enviar a requisição
    const response = await axios.post(
      'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
      envelopeSOAP,
      { headers }
    );
    
    // Processar a resposta
    const responseXml = response.data;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseXml, 'text/xml');
    
    // Extrair informações da resposta
    const cStat = xmlDoc.getElementsByTagName('cStat')[0]?.textContent;
    const xMotivo = xmlDoc.getElementsByTagName('xMotivo')[0]?.textContent;
    const nProt = xmlDoc.getElementsByTagName('nProt')[0]?.textContent;
    
    if (cStat === '135' || cStat === '155') {
      // Cancelamento autorizado
      return {
        sucesso: true,
        protocolo: nProt,
        mensagem: xMotivo
      };
    } else {
      // Cancelamento rejeitado
      return {
        sucesso: false,
        mensagem: `${cStat} - ${xMotivo}`
      };
    }
    */
  } catch (error) {
    console.error('Erro ao cancelar NFe:', error);
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao cancelar NFe'
    };
  }
}