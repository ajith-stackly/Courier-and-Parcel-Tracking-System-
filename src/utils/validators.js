export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[6-9]\d{9}$/;
  return re.test(phone);
};

export const validatePincode = (pincode) => {
  const re = /^\d{6}$/;
  return re.test(pincode);
};

export const validateRequired = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  return value !== null && value !== undefined;
};

export const validateWeight = (weight) => {
  const w = parseFloat(weight);
  return !isNaN(w) && w > 0 && w <= 100;
};

export const validateDimension = (dim) => {
  const d = parseFloat(dim);
  return !isNaN(d) && d > 0 && d <= 500;
};

export const validateAmount = (amount) => {
  const a = parseFloat(amount);
  return !isNaN(a) && a >= 0;
};

export const validateForm = (data, rules) => {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      if (rule.required && !validateRequired(data[field])) {
        errors[field] = rule.message || `${field} is required`;
        break;
      }
      if (rule.email && data[field] && !validateEmail(data[field])) {
        errors[field] = rule.message || 'Invalid email address';
        break;
      }
      if (rule.phone && data[field] && !validatePhone(data[field])) {
        errors[field] = rule.message || 'Invalid phone number (10 digits starting with 6-9)';
        break;
      }
      if (rule.pincode && data[field] && !validatePincode(data[field])) {
        errors[field] = rule.message || 'Invalid pincode (6 digits)';
        break;
      }
      if (rule.weight && data[field] && !validateWeight(data[field])) {
        errors[field] = rule.message || 'Weight must be between 0.1 and 100 kg';
        break;
      }
      if (rule.dimension && data[field] && !validateDimension(data[field])) {
        errors[field] = rule.message || 'Dimension must be between 1 and 500 cm';
        break;
      }
      if (rule.amount && data[field] && !validateAmount(data[field])) {
        errors[field] = rule.message || 'Invalid amount';
        break;
      }
      if (rule.minLength && data[field] && data[field].length < rule.minLength) {
        errors[field] = rule.message || `Minimum ${rule.minLength} characters required`;
        break;
      }
    }
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};
