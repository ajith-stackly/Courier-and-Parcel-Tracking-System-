import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { STATUS_FLOW } from './constants';

export const generateTrackingNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000000) + 1000000;
  return `CTK${year}${random}`;
};

export const generateId = () => {
  return Date.now() + Math.floor(Math.random() * 1000);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateString;
  }
};

export const formatTimeAgo = (dateString) => {
  if (!dateString) return '-';
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

export const calculateDeliveryCharge = (pricing, deliveryType, weight) => {
  const priceRule = pricing.find(
    p => p.deliveryType === deliveryType && weight >= p.minWeight && weight < p.maxWeight
  );
  if (!priceRule) {
    const fallback = pricing
      .filter(p => p.deliveryType === deliveryType)
      .sort((a, b) => b.maxWeight - a.maxWeight)[0];
    if (fallback) {
      return fallback.basePrice + (weight * fallback.pricePerKg);
    }
    return 0;
  }
  return priceRule.basePrice + (weight * priceRule.pricePerKg);
};

export const truncateText = (text, maxLength = 30) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export const getStatusStep = (status) => {
  const steps = [
    'Shipment Created', 'Branch Received', 'Processing',
    'In Transit', 'Arrived at Destination', 'Agent Assigned',
    'Out for Delivery', 'Delivered'
  ];
  return steps.indexOf(status);
};

export const getValidNextStatuses = (shipment) => {
  if (!shipment) return [];
  if (shipment.status === 'In Transit') {
    return shipment.returnInProgress ? ['Returned to Sender'] : ['Arrived at Destination'];
  }
  return STATUS_FLOW[shipment.status] || [];
};

export const canAccessShipment = (user, shipment) => {
  if (!user || !shipment) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return user.customerId != null && shipment.customerId != null && String(shipment.customerId) === String(user.customerId);
  if (user.role === 'delivery_agent') return user.agentId != null && shipment.agentId != null && String(shipment.agentId) === String(user.agentId);
  if (user.role === 'branch_staff') {
    return user.branchId != null && [shipment.currentBranchId, shipment.originBranchId, shipment.destinationBranchId]
      .some(branchId => String(branchId) === String(user.branchId));
  }
  return false;
};

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const sortData = (data, field, direction = 'asc') => {
  return [...data].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterData = (data, filters) => {
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value || value === '' || value === 'all') return true;
      const itemValue = String(item[key] || '').toLowerCase();
      return itemValue.includes(String(value).toLowerCase());
    });
  });
};

export const searchData = (data, query, fields) => {
  if (!query) return data;
  const q = query.toLowerCase();
  return data.filter(item =>
    fields.some(field => {
      const value = String(item[field] || '').toLowerCase();
      return value.includes(q);
    })
  );
};

export const paginate = (data, page, perPage = 10) => {
  const start = (page - 1) * perPage;
  return {
    data: data.slice(start, start + perPage),
    total: data.length,
    totalPages: Math.ceil(data.length / perPage),
    currentPage: page,
  };
};
