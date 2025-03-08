export const validators = {
  email: (email: string) => {
    const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return regex.test(email);
  },
  
  cpfCnpj: (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    return cleanValue.length === 11 || cleanValue.length === 14;
  },
  
  phone: (phone: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  },
  
  licensePlate: (plate: string) => {
    const regex = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;
    return regex.test(plate);
  },
  
  cep: (cep: string) => {
    const cleanCep = cep.replace(/[^\d]/g, '');
    return cleanCep.length === 8;
  },

  password: (password: string) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    return regex.test(password);
  },

  cnhNumber: (cnh: string) => {
    const cleanCnh = cnh.replace(/[^\d]/g, '');
    return cleanCnh.length === 11;
  }
};

export const formatters = {
  cpfCnpj: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },
  
  phone: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  },
  
  cep: (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  },
  
  currency: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  weight: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' kg';
  },

  volume: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' m³';
  },

  licensePlate: (value: string) => {
    return value.toUpperCase().replace(/([A-Z]{3})([0-9])([0-9A-Z])([0-9]{2})/, '$1-$2$3$4');
  }
};

export const masks = {
  cpfCnpj: (value: string) => {
    value = value.replace(/\D/g, '');
    if (value.length <= 11) {
      return value
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  },

  phone: (value: string) => {
    value = value.replace(/\D/g, '');
    if (value.length === 11) {
      return value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    return value.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  },

  cep: (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d{3})+?$/, '$1-$2');
  },

  licensePlate: (value: string) => {
    return value.toUpperCase().replace(/([A-Z]{3})([0-9])([0-9A-Z])([0-9]{2})/, '$1-$2$3$4');
  }
};