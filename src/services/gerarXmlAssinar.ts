import { DOMParser } from 'xmldom';

export function gerarXmlNF(chave: string): string {
  // Esta é uma implementação simplificada para fins de demonstração
  // Em um ambiente de produção, você precisaria gerar um XML completo e válido
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>000000000000001</idLote>
  <indSinc>1</indSinc>
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${chave.substring(35, 43)}</cNF>
        <natOp>VENDA DE MERCADORIAS</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>1</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <dhSaiEnt>${new Date().toISOString()}</dhSaiEnt>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.substring(43, 44)}</cDV>
        <tpAmb>${import.meta.env.VITE_SEFAZ_AMBIENTE || '2'}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${import.meta.env.VITE_EMPRESA_CNPJ || '58957775000130'}</CNPJ>
        <xNome>${import.meta.env.VITE_EMPRESA_RAZAO_SOCIAL || 'J&P DISTRIBUIDORA DE ALIMENTOS'}</xNome>
        <enderEmit>
          <xLgr>${import.meta.env.VITE_EMPRESA_ENDERECO || 'Rua Vanda'}</xLgr>
          <nro>${import.meta.env.VITE_EMPRESA_NUMERO || '329'}</nro>
          <xBairro>${import.meta.env.VITE_EMPRESA_BAIRRO || 'Parque dos Camargos'}</xBairro>
          <cMun>3506003</cMun>
          <xMun>${import.meta.env.VITE_EMPRESA_CIDADE || 'Barueri'}</xMun>
          <UF>${import.meta.env.VITE_EMPRESA_UF || 'SP'}</UF>
          <CEP>${import.meta.env.VITE_EMPRESA_CEP || '06436380'}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>${import.meta.env.VITE_EMPRESA_IE || '398260490115'}</IE>
        <CRT>1</CRT>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>123</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO TESTE</xProd>
          <NCM>22021000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>10.00</vUnCom>
          <vProd>10.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>10.00</vUnTrib>
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
            <PISOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pPIS>0.00</pPIS>
              <vPIS>0.00</vPIS>
            </PISOutr>
          </PIS>
          <COFINS>
            <COFINSOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pCOFINS>0.00</pCOFINS>
              <vCOFINS>0.00</vCOFINS>
            </COFINSOutr>
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
          <vProd>10.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>10.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>01</tPag>
          <vPag>10.00</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
</enviNFe>`;

  return xml;
}

export function assinarXml(xml: string): string {
  // Esta é uma implementação simulada para fins de demonstração
  // Em um ambiente de produção, você precisaria assinar o XML com um certificado digital válido
  
  // Simulando a assinatura adicionando uma tag de assinatura
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  
  // Neste ponto, em um ambiente real, você usaria uma biblioteca como xml-crypto
  // para assinar o XML com um certificado digital
  
  // Retornando o XML original para fins de demonstração
  return xml;
}