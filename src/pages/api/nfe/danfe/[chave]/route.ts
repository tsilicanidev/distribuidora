import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { NextRequest } from 'next/server';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function formatarChaveNFe(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatarCpfCnpj(doc: string): string {
  doc = doc.replace(/\D/g, '');
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

export async function GET(req: NextRequest, { params }: { params: { chave: string } }) {
  const chave = params.chave;

  const { data: fiscalInvoice, error } = await supabase
    .from('fiscal_invoices')
    .select('*, customer:customers(*)')
    .eq('xml_url', `/api/nfe/xml/${chave}`)
    .single();

  if (error || !fiscalInvoice) {
    return new Response(JSON.stringify({ error: 'Nota não encontrada' }), { status: 404 });
  }

  const { data: orders, error: orderErr } = await supabase
    .from('sales_orders')
    .select('id')
    .eq('customer_id', fiscalInvoice.customer_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1);

  const orderId = orders?.[0]?.id;
  if (!orderId) return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), { status: 404 });

  const { data: items, error: itemsError } = await supabase
    .from('sales_order_items')
    .select('*, product:products(*)')
    .eq('sales_order_id', orderId);

  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('DANFE - Documento Auxiliar da NFe', 20, 20);
  doc.setFontSize(10);
  doc.text(`Número: ${fiscalInvoice.number}`, 20, 30);
  doc.text(`Série: ${fiscalInvoice.series}`, 20, 35);
  doc.text(`Emitente: J&P DISTRIBUIDORA`, 20, 45);
  doc.text(`Destinatário: ${fiscalInvoice.customer.razao_social}`, 20, 55);
  doc.text(`CPF/CNPJ: ${formatarCpfCnpj(fiscalInvoice.customer.cpf_cnpj)}`, 20, 60);
  doc.text(`Chave: ${formatarChaveNFe(chave)}`, 20, 70);

  // QR Code
  const qrUrl = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?nfe=${chave}`;
  const qrCodeImage = await QRCode.toDataURL(qrUrl);
  doc.addImage(qrCodeImage, 'PNG', 150, 20, 40, 40);

  // Produtos
  const tableData = (items || []).map((item: any) => [
    item.product?.name || '',
    item.quantity.toString(),
    item.unit_price.toFixed(2),
    item.total_price.toFixed(2)
  ]);

  (doc as any).autoTable({
    startY: 80,
    head: [['Produto', 'Qtd', 'Valor Unit.', 'Valor Total']],
    body: tableData
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="danfe_${chave}.pdf"`
    }
  });
}