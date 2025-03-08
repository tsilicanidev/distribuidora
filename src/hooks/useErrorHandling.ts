import { useState, useCallback } from 'react';
import { ErrorHandler, AutoCorrect, DataValidator } from '../utils/testUtils';

export function useErrorHandling() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleError = useCallback(async (operation: () => Promise<void>) => {
    setLoading(true);
    setError(null);

    try {
      await ErrorHandler.retry(operation);
    } catch (err) {
      setError(ErrorHandler.handle(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const validateAndCorrect = useCallback((data: any) => {
    const corrected = { ...data };

    // Auto-correct phone numbers
    if (corrected.telefone) {
      corrected.telefone = AutoCorrect.fixPhoneNumber(corrected.telefone);
    }
    if (corrected.celular) {
      corrected.celular = AutoCorrect.fixPhoneNumber(corrected.celular);
    }

    // Auto-correct CPF/CNPJ
    if (corrected.cpf_cnpj) {
      corrected.cpf_cnpj = AutoCorrect.fixCPFCNPJ(corrected.cpf_cnpj);
    }

    // Auto-correct license plate
    if (corrected.plate) {
      corrected.plate = AutoCorrect.fixLicensePlate(corrected.plate);
    }

    // Validate email
    if (corrected.email && !DataValidator.validateEmail(corrected.email)) {
      throw new Error('Email inválido');
    }

    // Validate phone
    if (corrected.telefone && !DataValidator.validatePhone(corrected.telefone)) {
      throw new Error('Telefone inválido');
    }

    // Validate CPF/CNPJ
    if (corrected.cpf_cnpj && !DataValidator.validateCPFCNPJ(corrected.cpf_cnpj)) {
      throw new Error('CPF/CNPJ inválido');
    }

    // Validate license plate
    if (corrected.plate && !DataValidator.validateLicensePlate(corrected.plate)) {
      throw new Error('Placa inválida');
    }

    return corrected;
  }, []);

  return {
    error,
    loading,
    handleError,
    validateAndCorrect,
  };
}