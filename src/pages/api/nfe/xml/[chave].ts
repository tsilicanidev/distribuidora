import { supabase } from '../../../../lib/supabase';

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/#/g, '&#35;')
    .replace(/[\u0000-\u001F]+/g, '')  // remove caracteres de controle
    .replace(/[\r\n\t]+/g, ' ')        // substitui quebras de linha por espaço
    .trim();
}

function validarChaveNFe(chave: string): boolean {
  return /^\d{44}$/.test(chave);
}

async function buscarXmlNFe(chave: string): Promise<string> {
  try {
    const { data: fiscalInvoice, error: fiscalInvoiceError } = await supabase
      .from('fiscal_invoices')
      .select('*')
      .eq('xml_url', `/api/nfe/xml/${chave}`)
      .single();

    if (fiscalInvoiceError || !fiscalInvoice) {
      throw new Error('Nota fiscal não encontrada');
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${chave.substring(35, 43)}</cNF>
        <natOp>${escapeXml("VENDA DE MERCADORIA")}</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${escapeXml(fiscalInvoice.number)}</nNF>
        <dhEmi>${new Date(fiscalInvoice.issue_date).toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3505708</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.substring(43)}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0.0</verProc>
      </ide>
      <emit>
        <CNPJ>58957775000130</CNPJ>
        <xNome>${escapeXml("58957775 PATRICIA APARECIDA RAMOS DOS SANTOS")}</xNome>
        <xFant>${escapeXml("JP DISTRIBUIDORA")}</xFant>
        <enderEmit>
          <xLgr>${escapeXml("Rua Vanda")}</xLgr>
          <nro>329</nro>
          <xBairro>${escapeXml("Parque dos Camargos")}</xBairro>
          <cMun>3505708</cMun>
          <xMun>${escapeXml("Barueri")}</xMun>
          <UF>SP</UF>
          <CEP>06436380</CEP>
          <cPais>1058</cPais>
          <xPais>${escapeXml("BRASIL")}</xPais>
        </enderEmit>
        <IE>398260490115</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CNPJ>00000000000000</CNPJ>
        <xNome>${escapeXml("NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL")}</xNome>
        <enderDest>
          <xLgr>${escapeXml("Rua Teste")}</xLgr>
          <nro>123</nro>
          <xBairro>${escapeXml("Centro")}</xBairro>
          <cMun>3505708</cMun>
          <xMun>${escapeXml("Barueri")}</xMun>
          <UF>SP</UF>
          <CEP>00000000</CEP>
          <cPais>1058</cPais>
          <xPais>${escapeXml("BRASIL")}</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>123</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${escapeXml("PRODUTO TESTE")}</xProd>
          <NCM>22021000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>${fiscalInvoice.total_amount.toFixed(2)}</vUnCom>
          <vProd>${fiscalInvoice.total_amount.toFixed(2)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>${fiscalInvoice.total_amount.toFixed(2)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
          <PIS>
            <PISNT>
              <CST>07</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>07</CST>
            </COFINSNT>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${fiscalInvoice.total_amount.toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${fiscalInvoice.total_amount.toFixed(2)}</vNF>
          <vTotTrib>0.00</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>01</tPag>
          <vPag>${fiscalInvoice.total_amount.toFixed(2)}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>${escapeXml("DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.")}</infCpl>
      </infAdic>
    </infNFe>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
        <Reference URI="#NFe${chave}">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <DigestValue>DIGEST_VALUE_SIMULADO</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>SIGNATURE_VALUE_SIMULADO</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>CERTIFICATE_SIMULADO</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SP_NFE_PL_008i2</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${new Date().toISOString()}</dhRecbto>
      <nProt>${Math.floor(Math.random() * 1000000000).toString().padStart(15, '0')}</nProt>
      <digVal>DIGEST_VALUE_SIMULADO</digVal>
      <cStat>100</cStat>
      <xMotivo>${escapeXml("Autorizado o uso da NF-e")}</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

    return xml;
  } catch (error) {
    console.error('Erro ao buscar XML da NFe:', error);
    throw error;
  }
}

export default async function handler(req: any, res: any) {
  const { chave } = req.params;

  if (!validarChaveNFe(chave)) {
    return new Response(JSON.stringify({ error: 'Chave de NFe inválida' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const xml = await buscarXmlNFe(chave);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="nfe_${chave}.xml"`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao buscar XML da NFe' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}