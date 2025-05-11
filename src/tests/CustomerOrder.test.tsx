import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerOrder } from '../pages/CustomerOrder';
import { supabase } from '../lib/supabase';
import { validateToken } from '../utils/token';

// Mock the modules
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: '123',
              razao_social: 'Test Customer',
              cpf_cnpj: '12345678901',
              endereco: 'Test Address',
              bairro: 'Test District',
              cidade: 'Test City',
              estado: 'TS'
            },
            error: null
          }))
        })),
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: 'prod1',
                name: 'Test Product',
                price: 10.00,
                stock_quantity: 100
              }
            ],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'order1' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}));

vi.mock('../utils/token', () => ({
  validateToken: vi.fn(() => Promise.resolve({
    valid: true,
    customerId: '123',
    orderLink: {
      id: 'link1',
      customer_id: '123',
      active: true,
      expires_at: null
    }
  }))
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'test-token' }),
  Navigate: vi.fn(() => null)
}));

describe('CustomerOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load customer and product data', async () => {
    render(<CustomerOrder />);

    await waitFor(() => {
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  it('should handle adding and removing items', async () => {
    render(<CustomerOrder />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Add item
    const addButton = screen.getByText('Adicionar Produto');
    fireEvent.click(addButton);

    // Should now have 2 product selects
    const productSelects = screen.getAllByRole('combobox');
    expect(productSelects).toHaveLength(2);

    // Remove item
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    // Should be back to 1 product select
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('should submit order successfully', async () => {
    render(<CustomerOrder />);

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Select product
    const productSelect = screen.getByRole('combobox');
    fireEvent.change(productSelect, { target: { value: 'prod1' } });

    // Set quantity
    const quantityInput = screen.getByRole('spinbutton');
    fireEvent.change(quantityInput, { target: { value: '2' } });

    // Add notes
    const notesInput = screen.getByRole('textbox');
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /enviar pedido/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Pedido Enviado!')).toBeInTheDocument();
    });

    // Verify API calls
    expect(supabase.from).toHaveBeenCalledWith('sales_orders');
    expect(supabase.from).toHaveBeenCalledWith('sales_order_items');
    expect(supabase.from).toHaveBeenCalledWith('customer_order_links');
  });

  it('should handle validation errors', async () => {
    // Mock validateToken to return invalid
    (validateToken as any).mockResolvedValueOnce({
      valid: false,
      error: 'Token inválido'
    });

    render(<CustomerOrder />);

    await waitFor(() => {
      expect(screen.getByText('Token inválido')).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    // Mock API error
    (supabase.from as any).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: null,
            error: new Error('API Error')
          })
        })
      })
    }));

    render(<CustomerOrder />);

    await waitFor(() => {
      expect(screen.getByText('Erro ao buscar dados do cliente')).toBeInTheDocument();
    });
  });
});