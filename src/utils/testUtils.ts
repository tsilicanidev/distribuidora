export class ErrorHandler {
  static handle(error: any): string {
    if (error.code === 'not_admin') {
      return 'Você não tem permissão para realizar esta ação';
    }
    if (error.code === 'auth/invalid-email') {
      return 'Email inválido';
    }
    return error.message || 'Ocorreu um erro inesperado';
  }

  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
    throw lastError;
  }
}

export class DataValidator {
  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static validateCPFCNPJ(value: string): boolean {
    const numbers = value.replace(/\D/g, '');
    return numbers.length === 11 || numbers.length === 14;
  }

  static validatePhone(phone: string): boolean {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 11;
  }

  static validateLicensePlate(plate: string): boolean {
    return /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/.test(plate);
  }
}

export class AutoCorrect {
  static fixPhoneNumber(phone: string): string {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  static fixCPFCNPJ(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  static fixLicensePlate(plate: string): string {
    return plate.toUpperCase().replace(/([A-Z]{3})([0-9])([0-9A-Z])([0-9]{2})/, '$1-$2$3$4');
  }
}