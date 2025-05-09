import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { salvarXmlAutorizado } from '@/lib/nfe/salvarXml';

export const emitirNFe = async (xmlAssinado: string): Promise<{
  sucesso: boolean;
  chave?: string;
  resposta?: string;
  motivo?: string;
}> => {
  const endpoint = import.meta.env.VITE_SEFAZ_API_URL!;
  const envelope = `
  <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
                   xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
    <soap12:Header/>
    <soap12:Body>
      <nfe:nfeAutorizacaoLote>
        <nfe:xmlDados><![CDATA[${xmlAssinado}]]></nfe:xmlDados>
      </nfe:nfeAutorizacaoLote>
    </soap12:Body>
  </soap12:Envelope>`;

  try {
    const response = await axios.post(endpoint, envelope, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8'
      },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(response.data);

    const ret = parsed?.['soap:Envelope']?.['soap:Body']?.['nfeResultMsg']?.['retEnviNFe'];
    const infProt = ret?.protNFe?.infProt;

    if (infProt?.cStat === '100') {
      const chave = infProt.chNFe;
      await salvarXmlAutorizado(chave, xmlAssinado);
      return { sucesso: true, chave, resposta: response.data };
    }

    return {
      sucesso: false,
      resposta: response.data,
      motivo: infProt?.xMotivo || 'NF-e rejeitada pela SEFAZ'
    };

  } catch (err: any) {
    return {
      sucesso: false,
      resposta: err?.response?.data || err.message,
      motivo: 'Erro na comunicação com a SEFAZ'
    };
  }
}