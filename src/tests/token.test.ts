import { describe, it, expect, vi } from 'vitest';
import { generateToken, validateToken, isValidTokenFormat } from '../utils/token';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: {
              id: 'link1',
              customer_id: 'cust1',
              active: true,
              expires_at: null,
              token: 'valid-token',
              customer: {
                id: 'cust1',
                razao_social: 'Test Customer',
                cpf_cnpj: '12345678901'
              }
            },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('Token Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const token = generateToken();
      expect(token).toHaveLength(32);
      expect(isValidTokenFormat(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('isValidTokenFormat', () => {
    it('should validate correct format', () => {
      expect(isValidTokenFormat('1234567890abcdef1234567890abcdef')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidTokenFormat('short')).toBe(false);
      expect(isValidTokenFormat('invalid-chars-here')).toBe(false);
      expect(isValidTokenFormat('')).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const result = await validateToken('valid-token');
      expect(result.valid).toBe(true);
      expect(result.customerId).toBe('cust1');
      expect(result.orderLink).toBeDefined();
    });

    it('should reject invalid format', async () => {
      const result = await validateToken('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Formato de token inválido');
    });

    it('should handle inactive tokens', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({
              data: {
                active: false,
                customer: { id: 'cust1' }
              },
              error: null
            }))
          }))
        }))
      }));

      const result = await validateToken('valid-token');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Este link foi desativado');
    });

    it('should handle expired tokens', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({
              data: {
                active: true,
                expires_at: expiredDate.toISOString(),
                customer: { id: 'cust1' }
              },
              error: null
            }))
          }))
        }))
      }));

      const result = await validateToken('valid-token');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Este link expirou');
    });

    it('should handle database errors', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      }));

      const result = await validateToken('valid-token');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Erro ao validar token');
    });
  });
});