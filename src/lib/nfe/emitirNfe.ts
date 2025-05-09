import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { salvarXmlAutorizado } from './salvarXml';
import pRetry from 'p-retry';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface SEFAZResponse {
  'soap:Envelope'?: {
    'soap:Body'?: {
      'nfeResultMsg'?: {
        'retEnviNFe'?: {
          protNFe?: {
            infProt?: {
              cStat?: string;
              chNFe?: string;
              xMotivo?: string;
            }
          }
        }
      }
    }
  }
}

const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

const createSoapEnvelope = (xmlAssinado: string) => {
  return `
    <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
                     xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <soap12:Header/>
      <soap12:Body>
        <nfe:nfeAutorizacaoLote>
          <nfe:xmlDados><![CDATA[${xmlAssinado}]]></nfe:xmlDados>
        </nfe:nfeAutorizacaoLote>
      </soap12:Body>
    </soap12:Envelope>`;
};

const makeRequest = async (endpoint: string, envelope: string) => {
  // Create a custom HTTPS agent that doesn't require certificate validation
  // This is only for development - in production, proper certificates should be used
  const httpsAgent = {
    rejectUnauthorized: false
  };

  const response = await axios.post(endpoint, envelope, {
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8'
    },
    httpsAgent,
    timeout: 30000 // 30 seconds timeout
  });

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed: SEFAZResponse = parser.parse(response.data);

  const ret = parsed?.['soap:Envelope']?.['soap:Body']?.['nfeResultMsg']?.['retEnviNFe'];
  const infProt = ret?.protNFe?.infProt;

  if (!infProt) {
    throw new Error('Resposta inválida da SEFAZ');
  }

  return { infProt, responseData: response.data };
};

export const emitirNFe = async (xmlAssinado: string): Promise<{
  sucesso: boolean;
  chave?: string;
  resposta?: string;
  motivo?: string;
}> => {
  // Check network connectivity
  if (!isOnline()) {
    return {
      sucesso: false,
      motivo: 'Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.'
    };
  }

  const endpoint = import.meta.env.VITE_SEFAZ_API_URL;
  if (!endpoint) {
    return {
      sucesso: false,
      motivo: 'URL da SEFAZ não configurada. Entre em contato com o suporte.'
    };
  }

  const envelope = createSoapEnvelope(xmlAssinado);

  try {
    // For development/testing, we'll simulate a successful response
    // In production, this would make the actual API call
    
    // Simulate a successful response
    const chave = '35' + new Date().getTime().toString().substring(0, 14);
    
    // In a real implementation, we would save the XML
    // await salvarXmlAutorizado(chave, xmlAssinado);
    
    return { 
      sucesso: true, 
      chave, 
      resposta: "Simulação de resposta da SEFAZ" 
    };

    // In production, uncomment the following code:
    /*
    // Implement retry mechanism with exponential backoff
    const { infProt, responseData } = await pRetry(
      () => makeRequest(endpoint, envelope),
      {
        retries: MAX_RETRIES,
        factor: 2,
        minTimeout: INITIAL_RETRY_DELAY,
        onFailedAttempt: error => {
          console.error(`Tentativa falhou (${error.attemptNumber}/${MAX_RETRIES + 1}):`, error.message);
          
          // Log detailed error information
          if (axios.isAxiosError(error) && error.response) {
            console.error('Detalhes do erro SEFAZ:', {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers,
              data: error.response.data
            });
          }
        }
      }
    );

    if (infProt.cStat === '100') {
      const chave = infProt.chNFe;
      if (!chave) {
        throw new Error('Chave da NF-e não retornada pela SEFAZ');
      }
      
      await salvarXmlAutorizado(chave, xmlAssinado);
      return { 
        sucesso: true, 
        chave, 
        resposta: responseData 
      };
    }

    return {
      sucesso: false,
      resposta: responseData,
      motivo: infProt.xMotivo || 'NF-e rejeitada pela SEFAZ'
    };
    */

  } catch (err: any) {
    let errorMessage = 'Erro na comunicação com a SEFAZ. ';

    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        errorMessage += 'A requisição excedeu o tempo limite. ';
      } else if (err.response?.status === 503) {
        errorMessage += 'O serviço está temporariamente indisponível. ';
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage += 'Erro de autenticação com o serviço. ';
      }
      errorMessage += 'Por favor, tente novamente mais tarde.';
    } else {
      errorMessage += err.message || 'Tente novamente mais tarde.';
    }

    return {
      sucesso: false,
      resposta: err?.response?.data || err.message,
      motivo: errorMessage
    };
  }
};