import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/nfe/xml/[chave]
 * Retorna o XML autorizado da NF-e salvo no Supabase Storage.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chave } = req.query;

  if (!chave || typeof chave !== 'string' || chave.length !== 44) {
    return res.status(400).json({ erro: 'Chave inválida (deve conter 44 dígitos)' });
  }

  try {
    // For development, we'll generate a simple XML
    // In production, you would fetch the XML from storage
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
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
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>58957775000130</CNPJ>
        <xNome>J&amp;P DISTRIBUIDORA DE ALIMENTOS</xNome>
        <enderEmit>
          <xLgr>Rua Vanda</xLgr>
          <nro>329</nro>
          <xBairro>Parque dos Camargos</xBairro>
          <cMun>3506003</cMun>
          <xMun>Barueri</xMun>
          <UF>SP</UF>
          <CEP>06436380</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>398260490115</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CNPJ>00000000000000</CNPJ>
        <xNome>CLIENTE DEMONSTRATIVO</xNome>
        <enderDest>
          <xLgr>Rua Exemplo</xLgr>
          <nro>123</nro>
          <xBairro>Centro</xBairro>
          <cMun>3550308</cMun>
          <xMun>São Paulo</xMun>
          <UF>SP</UF>
          <CEP>00000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
        <email>cliente@example.com</email>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>123</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO DEMONSTRATIVO 1</xProd>
          <NCM>22021000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>15.00</vUnCom>
          <vProd>150.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>10.0000</qTrib>
          <vUnTrib>15.00</vUnTrib>
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
      <det nItem="2">
        <prod>
          <cProd>456</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO DEMONSTRATIVO 2</xProd>
          <NCM>22021000</NCM>
          <CFOP>5102</CFOP>
          <uCom>CX</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>30.00</vUnCom>
          <vProd>150.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>CX</uTrib>
          <qTrib>5.0000</qTrib>
          <vUnTrib>30.00</vUnTrib>
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
          <vProd>300.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>300.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>01</tPag>
          <vPag>300.00</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SP_NFE_PL_008i2</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${new Date().toISOString()}</dhRecbto>
      <nProt>135220000000000</nProt>
      <digVal>abcdefghijklmnopqrstuvwxyz12345=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (err: any) {
    res.status(500).json({ erro: 'Erro ao recuperar XML', detalhe: err.message });
  }
}