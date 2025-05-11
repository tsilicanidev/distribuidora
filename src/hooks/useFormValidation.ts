import { useState, useCallback } from 'react';
import { DataValidator, AutoCorrect } from '../utils/testUtils';

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((name: string, value: any) => {
    let error = '';

    switch (name) {
      case 'email':
        if (!DataValidator.validateEmail(value)) {
          error = 'Email inválido';
        }
        break;

      case 'cpf_cnpj':
        if (!DataValidator.validateCPFCNPJ(value)) {
          error = 'CPF/CNPJ inválido';
        }
        break;

      case 'telefone':
      case 'celular':
        if (!DataValidator.validatePhone(value)) {
          error = 'Telefone inválido';
        }
        break;

      case 'plate':
        if (!DataValidator.validateLicensePlate(value)) {
          error = 'Placa inválida';
        }
        break;

      case 'quantity':
        if (typeof value === 'number' && value <= 0) {
          error = 'Quantidade deve ser maior que zero';
        }
        break;

      case 'price':
        if (typeof value === 'number' && value < 0) {
          error = 'Preço não pode ser negativo';
        }
        break;
    }

    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    return !error;
  }, []);

  const validateForm = useCallback((data: Record<string, any>) => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.entries(data).forEach(([key, value]) => {
      if (!validateField(key, value)) {
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField]);

  const autoCorrectField = useCallback((name: string, value: string) => {
    switch (name) {
      case 'telefone':
      case 'celular':
        return AutoCorrect.fixPhoneNumber(value);

      case 'cpf_cnpj':
        return AutoCorrect.fixCPFCNPJ(value);

      case 'plate':
        return AutoCorrect.fixLicensePlate(value);

      default:
        return value;
    }
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    autoCorrectField
  };
}