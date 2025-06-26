import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { create } from 'xmlbuilder2';
import { DOMParser } from 'xmldom';
import { transmitirNFe } from './transmitirNfe';

// Configurações do ambiente
const AMBIENTE = import.meta.env.VITE_SEFAZ_AMBIENTE || '2'; // 1=Produção, 2=Homologação
const UF = import.meta.env.VITE_SEFAZ_UF || 'SP';
const CNPJ_EMPRESA = import.meta.env.VITE_EMPRESA_CNPJ || '58957775000130';
const IE_EMPRESA = import.meta.env.VITE_EMPRESA_IE || '398260490115';
const RAZAO_SOCIAL = import.meta.env.VITE_EMPRESA_RAZAO_SOCIAL || '58957775 PATRICIA APARECIDA RAMOS DOS SANTOS';
const ENDERECO_EMPRESA = import.meta.env.VITE_EMPRESA_ENDERECO || 'Rua Vanda';
const NUMERO_EMPRESA = import.meta.env.VITE_EMPRESA_NUMERO || '329';
const BAIRRO_EMPRESA = import.meta.env.VITE_EMPRESA_BAIRRO || 'Parque dos Camargos';
const CIDADE_EMPRESA = import.meta.env.VITE_EMPRESA_CIDADE || 'Barueri';
const UF_EMPRESA = import.meta.env.VITE_EMPRESA_UF || 'SP';
const CEP_EMPRESA = import.meta.env.VITE_EMPRESA_CEP || '06436380';
const EMAIL_EMPRESA = import.meta.env.VITE_EMPRESA_EMAIL || 'jp.distribuidora24@outlook.com';

// Função para gerar chave de acesso da NFe (44 dígitos)
export function generateNFeKey(): string {
  const uf = '35'; // SP
  const dataEmissao = new Date();
  const aamm = dataEmissao.getFullYear().toString().substring(2) + 
               (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
  
  const cnpj = CNPJ_EMPRESA.replace(/\D/g, '');
  const modelo = '55';
  const serie = '001';
  const numero = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0');
  const tipoEmissao = '1';
  const cNF = Math.floor(Math.random() * 100_000_000).toString().padStart(8, '0');
  
  const chaveBase = uf + aamm + cnpj + modelo + serie + numero + tipoEmissao + cNF;

  // Cálculo do DV (dígito verificador) com módulo 11
  const reversed = chaveBase.split('').reverse();
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];

  let soma = 0;
  for (let i = 0; i < reversed.length; i++) {
    soma += parseInt(reversed[i]) * pesos[i % pesos.length];
  }

  const resto = soma % 11;
  const dv = resto <= 1 ? 0 : 11 - resto;

  return chaveBase + dv.toString();
}

// Função para formatar CNPJ
function formatarCNPJ(cnpj: string) {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Função para formatar CPF
function formatarCPF(cpf: string) {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// Função para formatar CPF/CNPJ
function formatarCpfCnpj(documento: string) {
  const doc = documento.replace(/\D/g, '');
  if (doc.length === 11) {
    return formatarCPF(doc);
  } else if (doc.length === 14) {
    return formatarCNPJ(doc);
  }
  return documento;
}

// Função para gerar XML da NFe
async function gerarXmlNFe(order: any, items: any[]) {
  try {
    if (!order || !order.customer) {
      throw new Error('Dados do pedido ausentes ou incompletos para gerar o XML da NFe');
    }

    const customer = order.customer;
    
    if (!customer || !customer.cpf_cnpj || !customer.razao_social) {
      throw new Error('Dados do cliente ausentes ou incompletos para gerar o XML da NFe');
    }

    const dataEmissao = new Date();
    const chaveNFe = generateNFeKey();
    const dataFormatada = dataEmissao.toISOString().substring(0, 19) + '-03:00';
    
    // Criar objeto para o XML
    const nfeObj = {
      NFe: {
        '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
        infNFe: {
          '@Id': `NFe${chaveNFe}`,
          '@versao': '4.00',
          ide: {
            cUF: '35', // SP
            cNF: chaveNFe.substring(35, 43),
            natOp: 'VENDA DE MERCADORIA',
            mod: '55',
            serie: '1',
            nNF: order.number.replace(/\D/g, '').substring(0, 9).padStart(9, '0'),
            dhEmi: dataFormatada,
            dhSaiEnt: dataFormatada,
            tpNF: '1', // Saída
            idDest: '1', // Operação interna
            cMunFG: '3505708', // Código IBGE de Barueri
            tpImp: '1', // Retrato
            tpEmis: '1', // Normal
            cDV: chaveNFe.substring(43),
            tpAmb: AMBIENTE,
            finNFe: '1', // Normal
            indFinal: '1', // Consumidor final
            indPres: '1', // Operação presencial
            procEmi: '0', // Emissão normal
            verProc: '1.0.0'
          },
          emit: {
            CNPJ: CNPJ_EMPRESA.replace(/\D/g, ''),
            xNome: RAZAO_SOCIAL,
            xFant: 'J&P DISTRIBUIDORA',
            enderEmit: {
              xLgr: ENDERECO_EMPRESA,
              nro: NUMERO_EMPRESA,
              xBairro: BAIRRO_EMPRESA,
              cMun: '3505708', // Código IBGE de Barueri
              xMun: CIDADE_EMPRESA,
              UF: UF_EMPRESA,
              CEP: CEP_EMPRESA.replace(/\D/g, ''),
              cPais: '1058',
              xPais: 'BRASIL',
            },
            IE: IE_EMPRESA.replace(/\D/g, ''),
            CRT: '1', // Simples Nacional
          },
          dest: {
            CPF: customer.cpf_cnpj.length === 11 ? customer.cpf_cnpj.replace(/\D/g, '') : undefined,
            CNPJ: customer.cpf_cnpj.length > 11 ? customer.cpf_cnpj.replace(/\D/g, '') : undefined,
            xNome: customer.razao_social,
            enderDest: {
              xLgr: customer.endereco || 'Não informado',
              nro: 'S/N',
              xBairro: customer.bairro || 'Não informado',
              cMun: '3505708', // Código IBGE padrão (Barueri)
              xMun: customer.cidade || 'Barueri',
              UF: customer.estado || 'SP',
              CEP: customer.cep ? customer.cep.replace(/\D/g, '') : '00000000',
              cPais: '1058',
              xPais: 'BRASIL',
            },
            indIEDest: '9', // Não contribuinte
            email: customer.email || customer.email_nfe || '',
          },
          det: items.map((item, index) => ({
            '@nItem': index + 1,
            prod: {
              cProd: item.product_id.substring(0, 8),
              cEAN: 'SEM GTIN',
              xProd: item.product.name,
              NCM: '22021000', // NCM padrão para bebidas
              CFOP: '5102', // Venda de mercadoria dentro do estado
              uCom: item.product.unit || 'UN',
              qCom: item.quantity.toString(),
              vUnCom: item.unit_price.toFixed(2),
              vProd: item.total_price.toFixed(2),
              cEANTrib: 'SEM GTIN',
              uTrib: item.product.unit || 'UN',
              qTrib: item.quantity.toString(),
              vUnTrib: item.unit_price.toFixed(2),
              indTot: '1',
            },
            imposto: {
              ICMS: {
                ICMSSN102: {
                  orig: '0',
                  CSOSN: '102', // Simples Nacional sem permissão de crédito
                }
              },
              PIS: {
                PISNT: {
                  CST: '07', // Operação isenta
                }
              },
              COFINS: {
                COFINSNT: {
                  CST: '07', // Operação isenta
                }
              }
            }
          })),
          total: {
            ICMSTot: {
              vBC: '0.00',
              vICMS: '0.00',
              vICMSDeson: '0.00',
              vFCP: '0.00',
              vBCST: '0.00',
              vST: '0.00',
              vFCPST: '0.00',
              vFCPSTRet: '0.00',
              vProd: order.total_amount.toFixed(2),
              vFrete: '0.00',
              vSeg: '0.00',
              vDesc: '0.00',
              vII: '0.00',
              vIPI: '0.00',
              vIPIDevol: '0.00',
              vPIS: '0.00',
              vCOFINS: '0.00',
              vOutro: '0.00',
              vNF: order.total_amount.toFixed(2),
              vTotTrib: '0.00',
            }
          },
          transp: {
            modFrete: '9', // Sem frete
          },
          pag: {
            detPag: {
              tPag: order.payment_method ? mapPaymentMethod(order.payment_method) : '01', // Dinheiro
              vPag: order.total_amount.toFixed(2),
            }
          },
          infAdic: {
            infCpl: 'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE IPI.'
          }
        },
      }
    };
    
    // Converter objeto para XML
    const xml = create(nfeObj).end({ prettyPrint: true });
    
    return {
      xml,
      chave: chaveNFe
    };
  } catch (error) {
    console.error('Erro ao gerar XML da NFe:', error);
    throw new Error('Falha ao gerar XML da NFe');
  }
}

// Mapear método de pagamento para código SEFAZ
function mapPaymentMethod(method: string): string {
  const paymentMap: Record<string, string> = {
    'dinheiro': '01', // Dinheiro
    'cartao_credito': '03', // Cartão de Crédito
    'cartao_debito': '04', // Cartão de Débito
    'pix': '17', // PIX
    'boleto': '15', // Boleto Bancário
    'transferencia': '03', // Transferência
    'cheque': '02', // Cheque
    'prazo': '99', // Outros
  };
  
  return paymentMap[method] || '99'; // Padrão: Outros
}

// Função para processar a emissão completa da NFe
export async function processarEmissaoNFe(orderId: string): Promise<{
  sucesso: boolean;
  motivo?: string;
  chave?: string;
  protocolo?: string;
}> {
  try {
    // Buscar dados do pedido com relacionamentos explícitos
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers!sales_orders_customer_id_fkey(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Erro ao buscar pedido:', orderError);
      throw new Error('Erro ao buscar pedido');
    }

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    // Verificar se já existe uma NFe emitida
    const { data: existente, error } = await supabase
      .from('fiscal_invoices')
      .select('id, number')
      .eq('number', order.number)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar NFe existente:', error);
      return {
        sucesso: false,
        motivo: 'Erro ao verificar NFe existente.',
      };
    }

    if (existente) {
      return {
        sucesso: false,
        motivo: 'Nota fiscal já emitida para este pedido.',
      };
    }

    // Buscar itens do pedido com produtos
    const { data: items, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        *,
        product:products!sales_order_items_product_id_fkey(*)
      `)
      .eq('sales_order_id', orderId);

    if (itemsError || !Array.isArray(items) || items.length === 0) {
      console.error('Erro ao buscar itens do pedido:', itemsError);
      throw new Error('Itens do pedido não encontrados ou inválidos');
    }

    console.log('Items encontrados:', items);

    // Verificar e atualizar estoque para cada item
    for (const item of items) {
      if (!item.product) {
        throw new Error(`Produto não encontrado para o item ${item.id}`);
      }

      // Verificar estoque atual
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('stock_quantity, name')
        .eq('id', item.product_id)
        .single();

      if (productError || !currentProduct) {
        console.error('Erro ao buscar produto atual:', productError);
        throw new Error(`Erro ao buscar produto ${item.product.name}`);
      }

      // Verificar se há estoque suficiente
      if (currentProduct.stock_quantity < item.quantity) {
        throw new Error(`Estoque insuficiente para o produto ${currentProduct.name}. Disponível: ${currentProduct.stock_quantity}, Solicitado: ${item.quantity}`);
      }

      // Atualizar estoque
      const newStockQuantity = currentProduct.stock_quantity - item.quantity;
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStockQuantity })
        .eq('id', item.product_id);

      if (updateError) {
        console.error('Erro ao atualizar estoque:', updateError);
        throw new Error(`Erro ao atualizar estoque do produto ${currentProduct.name}`);
      }
      
      // Registrar movimentação de estoque
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }
      
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: item.product_id,
          quantity: item.quantity,
          type: 'OUT',
          reference_id: orderId,
          created_by: user.id
        }]);

      if (movementError) {
        console.error('Erro ao registrar movimentação de estoque:', movementError);
      }
    }

    // Gerar XML da NFe
    const { xml, chave } = await gerarXmlNFe(order, items);

    // Transmitir para SEFAZ
    let resultado;
    try {
      resultado = await transmitirNFe(xml, chave);
    } catch (e) {
      console.error('Erro ao transmitir NFe:', e);
      return {
        sucesso: false,
        motivo: e instanceof Error ? e.message : 'Erro desconhecido ao transmitir NFe',
      };
    }

    if (!resultado?.sucesso || !resultado?.chave || !resultado?.protocolo) {
      return {
        sucesso: false,
        motivo: resultado?.mensagem || 'Erro ao transmitir NFe',
      };
    }

    // Registrar NFe no banco de dados
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }

    // Verificar se já existe uma nota fiscal com o mesmo número
    const { data: existingInvoice } = await supabase
      .from('fiscal_invoices')
      .select('id')
      .eq('number', order.number)
      .maybeSingle();

    if (existingInvoice) {
      console.log('Nota fiscal já existe, atualizando...');
      const { error: updateError } = await supabase
        .from('fiscal_invoices')
        .update({
          series: '1',
          issue_date: new Date().toISOString(),
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          tax_amount: order.total_amount * 0.18, // Exemplo fixo
          status: 'issued',
          created_by: user.id,
          xml_url: `/api/nfe/xml/${resultado.chave || chave}`,
          pdf_url: `/api/nfe/danfe/${resultado.chave || chave}`
        })
        .eq('id', existingInvoice.id);

      if (updateError) {
        console.error('Erro ao atualizar nota fiscal:', updateError);
        return {
          sucesso: false,
          motivo: 'Erro ao atualizar nota fiscal'
        };
      }
    } else {
      // Criar nova nota fiscal
      const { error: fiscalInvoiceError } = await supabase
        .from('fiscal_invoices')
        .insert([{
          number: order.number,
          series: '1',
          issue_date: new Date().toISOString(),
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          tax_amount: order.total_amount * 0.18, // Exemplo fixo
          status: 'issued',
          created_by: user.id,
          xml_url: `/api/nfe/xml/${resultado.chave || chave}`,
          pdf_url: `/api/nfe/danfe/${resultado.chave || chave}`
        }]);

      if (fiscalInvoiceError) {
        console.error('Erro ao registrar nota fiscal:', fiscalInvoiceError);
        return {
          sucesso: false,
          motivo: 'Erro ao registrar nota fiscal'
        };
      }
    }

    // Atualizar status do pedido
    const { error: updateError } = await supabase
      .from('sales_orders')
      .update({ status: 'approved' })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erro ao atualizar status do pedido:', updateError);
    }

    return {
      sucesso: true,
      chave: resultado.chave || chave,
      protocolo: resultado.protocolo
    };
  } catch (error) {
    console.error('Erro ao processar emissão de NFe:', error);
    return {
      sucesso: false,
      motivo: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}