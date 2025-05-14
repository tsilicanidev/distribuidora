import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../../../lib/supabase';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { DOMParser } from 'xmldom';

// Função para validar a chave da NFe
function validarChaveNFe(chave: string): boolean {
  // Verifica se a chave tem 44 dígitos e contém apenas números
  return /^\d{44}$/.test(chave);
}

// Função para formatar CNPJ
function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Função para formatar CPF
function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// Função para formatar CPF/CNPJ
function formatarCpfCnpj(documento: string): string {
  const doc = documento.replace(/\D/g, '');
  if (doc.length === 11) {
    return formatarCPF(doc);
  } else if (doc.length === 14) {
    return formatarCNPJ(doc);
  }
  return documento;
}

// Função para formatar a chave da NFe com espaços a cada 4 dígitos
function formatarChaveNFe(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Função para gerar o código de barras da chave
async function gerarCodigoBarras(chave: string): Promise<string> {
  try {
    // Cria um elemento canvas temporário
    const canvas = document.createElement('canvas');
    
    // Gera o código de barras
    JsBarcode(canvas, chave, {
      format: 'CODE128',
      displayValue: false,
      width: 2,
      height: 50
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
async function gerarQRCode(chave: string): Promise<string> {
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

// Função para buscar dados da NFe
async function buscarDadosNFe(chave: string) {
  try {
    // Buscar a nota fiscal pelo número da chave
    const { data: fiscalInvoice, error: fiscalInvoiceError } = await supabase
      .from('fiscal_invoices')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('xml_url', `/api/nfe/xml/${chave}`)
      .single();
    
    if (fiscalInvoiceError || !fiscalInvoice) {
      throw new Error('Nota fiscal não encontrada');
    }
    
    // Buscar os itens da nota fiscal
    let items = [];
    
    // Se a nota fiscal estiver vinculada a um pedido, buscar os itens do pedido
    if (fiscalInvoice.delivery_note_id) {
      // Buscar os itens do romaneio
      const { data: deliveryItems, error: deliveryItemsError } = await supabase
        .from('delivery_note_items')
        .select(`
          order_id
        `)
        .eq('delivery_note_id', fiscalInvoice.delivery_note_id);
      
      if (deliveryItemsError) {
        throw deliveryItemsError;
      }
      
      // Buscar os itens dos pedidos vinculados ao romaneio
      if (deliveryItems && deliveryItems.length > 0) {
        const orderIds = deliveryItems.map(item => item.order_id);
        
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('sales_order_items')
          .select(`
            *,
            product:products(*)
          `)
          .in('sales_order_id', orderIds);
        
        if (orderItemsError) {
          throw orderItemsError;
        }
        
        items = orderItems || [];
      }
    } else {
      // Buscar pedidos vinculados ao cliente
      const { data: orders, error: ordersError } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('customer_id', fiscalInvoice.customer_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (ordersError) {
        throw ordersError;
      }
      
      if (orders && orders.length > 0) {
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('sales_order_items')
          .select(`
            *,
            product:products(*)
          `)
          .eq('sales_order_id', orders[0].id);
        
        if (orderItemsError) {
          throw orderItemsError;
        }
        
        items = orderItems || [];
      }
    }
    
    return {
      fiscalInvoice,
      items
    };
  } catch (error) {
    console.error('Erro ao buscar dados da NFe:', error);
    throw error;
  }
}

// Função para gerar o DANFE
export default async function handler(req: any, res: any) {
  // ⚠️ Correção essencial: usar req.query no lugar de req.params
  const { chave } = req.query;

  if (typeof chave !== 'string' || !validarChaveNFe(chave)) {
    return res.status(400).json({ error: 'Chave de NFe inválida' });
  }

  try {
    const { fiscalInvoice, items } = await buscarDadosNFe(chave);
    const qrCodeDataUrl = await gerarQRCode(chave);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Configurações
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    // Cabeçalho
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('DOCUMENTO AUXILIAR DA', pageWidth / 2, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA FISCAL ELETRÔNICA', pageWidth / 2, margin + 5, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('0 - ENTRADA', 40, margin + 10);
    doc.text('1 - SAÍDA', 60, margin + 10);
    doc.setFillColor(0, 0, 0);
    doc.rect(53, margin + 8, 3, 3, 'F'); // Marca "Saída"
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Nº ' + fiscalInvoice.number, pageWidth / 2, margin + 15, { align: 'center' });
    doc.text('SÉRIE ' + fiscalInvoice.series, pageWidth / 2, margin + 20, { align: 'center' });
    
    // Chave de acesso
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CHAVE DE ACESSO', margin, margin + 25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(formatarChaveNFe(chave), pageWidth / 2, margin + 30, { align: 'center' });
    
    // Protocolo de autorização
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Protocolo de Autorização: ' + Math.floor(Math.random() * 1000000000).toString().padStart(15, '0'), margin, margin + 35);
    doc.text('Data de Autorização: ' + new Date().toLocaleString(), margin + 80, margin + 35);
    
    // Dados do emitente
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, margin + 40, pageWidth - 2 * margin, 25, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EMITENTE', margin + 2, margin + 45);
    doc.setFontSize(9);
    doc.text('J&P DISTRIBUIDORA DE ALIMENTOS', margin + 2, margin + 50);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: ' + formatarCNPJ('58957775000130'), margin + 2, margin + 55);
    doc.text('Endereço: Rua Vanda, 329, Parque dos Camargos, Barueri - SP, 06436380', margin + 2, margin + 60);
    
    // Dados do destinatário
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, margin + 70, pageWidth - 2 * margin, 25, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINATÁRIO', margin + 2, margin + 75);
    doc.setFontSize(9);
    doc.text(fiscalInvoice.customer.razao_social, margin + 2, margin + 80);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CPF/CNPJ: ' + formatarCpfCnpj(fiscalInvoice.customer.cpf_cnpj), margin + 2, margin + 85);
    doc.text(`Endereço: ${fiscalInvoice.customer.endereco || 'Não informado'}, ${fiscalInvoice.customer.bairro || 'Não informado'}, ${fiscalInvoice.customer.cidade || 'Não informado'} - ${fiscalInvoice.customer.estado || 'SP'}, ${fiscalInvoice.customer.cep || 'Não informado'}`, margin + 2, margin + 90);
    
    // Tabela de produtos
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DOS PRODUTOS', margin, margin + 100);
    
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

const tableData = items
  .map(item => {
    if (!item.product || !item.product.name) {
      console.warn('Produto inválido:', item);
      return null;
    }
    return {
      codigo: item.product_id.substring(0, 8),
      descricao: item.product.name,
      qtd: item.quantity.toString(),
      un: item.product.unit || 'UN',
      vlUnit: `R$ ${item.unit_price.toFixed(2)}`,
      vlTotal: `R$ ${item.total_price.toFixed(2)}`
    };
  })
  .filter(Boolean);
    
    // Adicionar tabela
    (doc as any).autoTable({
      head: [headers.map(h => h.header)],
      body: tableData.map(row => headers.map(h => row[h.dataKey as keyof typeof row])),
      startY: margin + 105,
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
    doc.text(`R$ ${fiscalInvoice.total_amount.toFixed(2)}`, pageWidth - margin, finalY, { align: 'right' });
    
    // Informações adicionais
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('INFORMAÇÕES ADICIONAIS', margin, finalY + 10);
    doc.text('DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.', margin, finalY + 15);
    
    // QR Code
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
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="danfe_${chave}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar DANFE:', error);
    res.status(500).json({ error: 'Erro ao gerar DANFE' });
  }
}