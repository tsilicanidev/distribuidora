import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Generate a secure random token
export function generateToken(): string {
  return uuidv4().replace(/-/g, '');
}

// Validate token format
export function isValidTokenFormat(token: string): boolean {
  return /^[0-9a-zA-Z]{32}$/.test(token);
}

// Parse token from URL
export function parseTokenFromUrl(): string | null {
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[pathParts.length - 1];
  return token || null;
}

// Create a new order link
export async function createOrderLink(
  customerId: string,
  expirationDate: string
): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  orderLink?: any;
}> {
  try {
    // Generate token
    const token = generateToken();

    // Create order link
    const { data: orderLink, error: linkError } = await supabase
      .from('customer_order_links')
      .insert([{
        customer_id: customerId,
        token: token,
        expires_at: new Date(expirationDate).toISOString(),
        active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select(`
        *,
        customer:customers (
          id,
          razao_social,
          cpf_cnpj
        )
      `)
      .single();

    if (linkError) {
      throw linkError;
    }

    return {
      success: true,
      token,
      orderLink
    };
  } catch (error) {
    console.error('Error creating order link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar link'
    };
  }
}

// Validate token in database
export async function validateToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  customerId?: string;
  orderLink?: {
    id: string;
    customer_id: string;
    active: boolean;
    expires_at: string | null;
  };
}> {
  try {
    if (!isValidTokenFormat(token)) {
      return { valid: false, error: 'Formato de token inválido' };
    }

    // Check if token exists and is valid
    const { data: linkData, error: linkError } = await supabase
      .from('customer_order_links')
      .select(`
        id,
        customer_id,
        active,
        expires_at,
        token,
        customer:customers (
          id,
          razao_social,
          cpf_cnpj,
          endereco,
          bairro,
          cidade,
          estado,
          cep
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (linkError) {
      return { valid: false, error: 'Erro ao validar token' };
    }

    if (!linkData) {
      return { valid: false, error: 'Token não encontrado' };
    }

    if (!linkData.active) {
      return { valid: false, error: 'Este link foi desativado' };
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return { valid: false, error: 'Este link expirou' };
    }

    if (!linkData.customer) {
      return { valid: false, error: 'Cliente não encontrado' };
    }

    return { 
      valid: true, 
      customerId: linkData.customer_id,
      orderLink: {
        id: linkData.id,
        customer_id: linkData.customer_id,
        active: linkData.active,
        expires_at: linkData.expires_at
      }
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Erro ao validar token'
    };
  }
}