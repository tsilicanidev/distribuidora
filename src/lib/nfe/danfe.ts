import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

// Função para formatar CNPJ
export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Função para formatar CPF
export function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// Função para formatar CPF/CNPJ
export function formatarCpfCnpj(documento: string): string {
  const doc = documento.replace(/\D/g, '');
  if (doc.length === 11) {
    return formatarCPF(doc);
  } else if (doc.length === 14) {
    return formatarCNPJ(doc);
  }
  return documento;
}

// Função para formatar a chave da NFe com espaços a cada 4 dígitos
export function formatarChaveNFe(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Função para gerar o código de barras da chave
export async function gerarCodigoBarras(chave: string): Promise<string> {
  try {
    // Cria um elemento canvas temporário
    const canvas = document.createElement('canvas');
    
    // Gera o código de barras
    JsBarcode(canvas, chave, {
      format: 'CODE128',
      displayValue: false,
      width: 1.5,
      height: 50,
      margin: 0
    });
    
    // Converte o canvas para uma imagem base64
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (error) {
    console.error('Erro ao gerar código de barras:', error);
    // Retorna uma string vazia em caso de erro
    return '';
  }
}

// Função para gerar o QR Code da NFe
export async function gerarQRCode(chave: string): Promise<string> {
  try {
    // URL para consulta pública da NFe
    const url = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XbSeqxE8pl8=&nfe=${chave}`;
    
    // Gera o QR Code
    const qrCode = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 150
    });
    
    return qrCode;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    throw error;
  }
}

// Função para gerar o DANFE
export async function gerarDANFE(
  chave: string,
  numero: string,
  serie: string,
  dataEmissao: Date,
  emitente: {
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  },
  destinatario: {
    nome: string;
    cpfCnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  },
  itens: Array<{
    codigo: string;
    descricao: string;
    quantidade: number;
    unidade: string;
    valorUnitario: number;
    valorTotal: number;
  }>,
  total: number
): Promise<Blob> {
  // Criar o PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Configurações
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  
  // Gerar código de barras
  const codigoBarras = await gerarCodigoBarras(chave);
  
  // Cabeçalho
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('DOCUMENTO AUXILIAR DA', pageWidth / 2, margin, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL ELETRÔNICA', pageWidth / 2, margin + 5, { align: 'center' });
  
  // Código de barras
  if (codigoBarras) {
    doc.addImage(codigoBarras, 'PNG', margin, margin + 10, pageWidth - 2 * margin, 15);
  }
  
  // Informações da NF-e
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('0 - ENTRADA', 40, margin + 30);
  doc.text('1 - SAÍDA', 60, margin + 30);
  doc.setFillColor(0, 0, 0);
  doc.rect(53, margin + 28, 3, 3, 'F'); // Marca "Saída"
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Nº ' + numero, pageWidth / 2, margin + 35, { align: 'center' });
  doc.text('SÉRIE ' + serie, pageWidth / 2, margin + 40, { align: 'center' });
  
  // Chave de acesso
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CHAVE DE ACESSO', margin, margin + 45);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarChaveNFe(chave), pageWidth / 2, margin + 50, { align: 'center' });
  
  // Protocolo de autorização
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Protocolo de Autorização: ' + Math.floor(Math.random() * 1000000000).toString().padStart(15, '0'), margin, margin + 55);
  doc.text('Data de Autorização: ' + dataEmissao.toLocaleString(), margin + 80, margin + 55);
  
  // Dados do emitente
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, margin + 60, pageWidth - 2 * margin, 25, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EMITENTE', margin + 2, margin + 65);
  doc.setFontSize(9);
  doc.text(emitente.nome, margin + 2, margin + 70);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CNPJ: ' + formatarCNPJ(emitente.cnpj), margin + 2, margin + 75);
  doc.text(`Endereço: ${emitente.endereco}, ${emitente.bairro}, ${emitente.cidade} - ${emitente.uf}, ${emitente.cep}`, margin + 2, margin + 80);
  
  // Dados do destinatário
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, margin + 90, pageWidth - 2 * margin, 25, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO', margin + 2, margin + 95);
  doc.setFontSize(9);
  doc.text(destinatario.nome, margin + 2, margin + 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CPF/CNPJ: ' + formatarCpfCnpj(destinatario.cpfCnpj), margin + 2, margin + 105);
  doc.text(`Endereço: ${destinatario.endereco}, ${destinatario.bairro}, ${destinatario.cidade} - ${destinatario.uf}, ${destinatario.cep}`, margin + 2, margin + 110);
  
  // Tabela de produtos
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DOS PRODUTOS', margin, margin + 120);
  
  // Cabeçalho da tabela
  const headers = [
    { header: 'CÓDIGO', dataKey: 'codigo' },
    { header: 'DESCRIÇÃO', dataKey: 'descricao' },
    { header: 'QTD', dataKey: 'qtd' },
    { header: 'UN', dataKey: 'un' },
    { header: 'VL. UNIT', dataKey: 'vlUnit' },
    { header: 'VL. TOTAL', dataKey: 'vlTotal' }
  ];
  
  // Dados da tabela
  const tableData = itens.map(item => ({
    codigo: item.codigo,
    descricao: item.descricao,
    qtd: item.quantidade.toString(),
    un: item.unidade,
    vlUnit: `R$ ${item.valorUnitario.toFixed(2)}`,
    vlTotal: `R$ ${item.valorTotal.toFixed(2)}`
  }));
  
  // Adicionar tabela
  (doc as any).autoTable({
    head: [headers.map(h => h.header)],
    body: tableData.map(row => headers.map(h => row[h.dataKey as keyof typeof row])),
    startY: margin + 125,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] }
  });
  
  // Totais
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL DA NOTA', pageWidth - margin - 60, finalY);
  doc.text(`R$ ${total.toFixed(2)}`, pageWidth - margin, finalY, { align: 'right' });
  
  // Informações adicionais
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('INFORMAÇÕES ADICIONAIS', margin, finalY + 10);
  doc.text('DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.', margin, finalY + 15);
  
  // QR Code
  const qrCodeDataUrl = await gerarQRCode(chave);
  doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 30, finalY + 20, 30, 30);
  doc.setFontSize(7);
  doc.text('Consulta pela chave de acesso em', pageWidth - margin - 30, finalY + 55);
  doc.text('www.nfe.fazenda.gov.br/portal', pageWidth - margin - 30, finalY + 60);
  
  // Rodapé
  const rodapeY = pageHeight - margin;
  doc.setFontSize(8);
  doc.text('DANFE - Documento Auxiliar da Nota Fiscal Eletrônica', pageWidth / 2, rodapeY - 5, { align: 'center' });
  doc.text(`Emitido em: ${new Date().toLocaleString()}`, pageWidth / 2, rodapeY, { align: 'center' });
  
  // Converter o PDF para um blob
  return doc.output('blob');
}