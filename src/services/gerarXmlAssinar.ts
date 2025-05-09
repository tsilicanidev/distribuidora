import 'dotenv/config';
import fs from 'fs';
import forge from 'node-forge';
import { create } from 'xmlbuilder2';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from 'xmldom';

export function gerarXmlNF(chave: string): string {
  const xml = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('enviNFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe', versao: '4.00' })
      .ele('idLote').txt('000000000000001').up()
      .ele('indSinc').txt('1').up()
      .ele('NFe')
        .ele('infNFe', { Id: `NFe${chave}`, versao: '4.00' })
          .ele('ide')
            .ele('cUF').txt('35').up()
            .ele('mod').txt('55').up()
            .ele('serie').txt('1').up()
            .ele('nNF').txt('1').up()
            .ele('dhEmi').txt(new Date().toISOString()).up()
            .ele('tpNF').txt('1').up()
            .ele('cMunFG').txt('3550308').up()
            .ele('tpAmb').txt(process.env.VITE_SEFAZ_AMBIENTE || '2').up()
            .ele('finNFe').txt('1').up()
            .ele('indFinal').txt('1').up()
            .ele('indPres').txt('1').up()
            .ele('procEmi').txt('0').up()
            .ele('verProc').txt('1.0').up()
          .up()
        .up()
      .up()
    .up()
    .end({ prettyPrint: true });

  return xml;
}

export function assinarXml(xml: string): string {
  const pfxPath = process.env.VITE_CERTIFICADO_DIGITAL_PATH!;
  const senha = process.env.VITE_CERTIFICADO_SENHA!;

  const pfx = fs.readFileSync(pfxPath);
  const p12Asn1 = forge.asn1.fromDer(pfx.toString('binary'), false);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha);

  const keyObj = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag][0];
  const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0];

  const privateKey = forge.pki.privateKeyToPem(keyObj.key);
  const certificate = forge.pki.certificateToPem(certObj.cert).replace(/-----[^-]+-----|\n/g, '');

  const sig = new SignedXml();
  sig.addReference("//*[local-name(.)='infNFe']");
  sig.signingKey = privateKey;
  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certificate}</X509Certificate></X509Data>`
  };

  const doc = new DOMParser().parseFromString(xml);
  sig.computeSignature(doc);

  return sig.getSignedXml();
}
