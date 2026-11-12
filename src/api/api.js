import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Users
export const getUsers = () => api.get('/users');
export const getUserByEmail = (email) => api.get(`/users?email=${email}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);

// Customers
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Branches
export const getBranches = () => api.get('/branches');
export const getBranch = (id) => api.get(`/branches/${id}`);
export const createBranch = (data) => api.post('/branches', data);
export const updateBranch = (id, data) => api.put(`/branches/${id}`, data);
export const deleteBranch = (id) => api.delete(`/branches/${id}`);

// Delivery Agents
export const getAgents = () => api.get('/deliveryAgents');
export const getAgent = (id) => api.get(`/deliveryAgents/${id}`);
export const getAgentsByBranch = (branchId) => api.get(`/deliveryAgents?branchId=${branchId}`);
export const getAvailableAgents = (branchId) => api.get(`/deliveryAgents?branchId=${branchId}&availability=available`);
export const createAgent = (data) => api.post('/deliveryAgents', data);
export const updateAgent = (id, data) => api.patch(`/deliveryAgents/${id}`, data);
export const deleteAgent = (id) => api.delete(`/deliveryAgents/${id}`);

// Parcels
export const getParcels = () => api.get('/parcels');

// Shipments
export const getShipments = () => api.get('/shipments');
export const getShipment = (id) => api.get(`/shipments/${id}`);
export const getShipmentByTracking = (trackingNumber) => api.get(`/shipments?trackingNumber=${trackingNumber}`);
export const getShipmentsByCustomer = (customerId) => api.get(`/shipments?customerId=${customerId}`);
export const getShipmentsByBranch = (branchId) => api.get(`/shipments?currentBranchId=${branchId}`);
export const getShipmentsByAgent = (agentId) => api.get(`/shipments?agentId=${agentId}`);
export const createShipment = (data) => api.post('/shipments', data);
export const updateShipment = (id, data) => api.put(`/shipments/${id}`, data);
export const patchShipment = (id, data) => api.patch(`/shipments/${id}`, data);

// Tracking History
export const getTrackingHistory = () => api.get('/trackingHistory?_sort=timestamp&_order=desc');
export const getTrackingByShipment = (shipmentId) => api.get(`/trackingHistory?shipmentId=${shipmentId}&_sort=timestamp&_order=asc`);
export const getTrackingByNumber = (trackingNumber) => api.get(`/trackingHistory?trackingNumber=${trackingNumber}&_sort=timestamp&_order=asc`);
export const createTrackingEntry = (data) => api.post('/trackingHistory', data);

// Payments
export const getPayments = () => api.get('/payments');
export const getPayment = (id) => api.get(`/payments/${id}`);
export const getPaymentByShipment = (shipmentId) => api.get(`/payments?shipmentId=${shipmentId}`);
export const getPaymentsByCustomer = (customerId) => api.get(`/payments?customerId=${customerId}`);
export const createPayment = (data) => api.post('/payments', data);
export const updatePayment = (id, data) => api.put(`/payments/${id}`, data);

// Pricing
export const getPricing = () => api.get('/pricing');
export const getPricingRule = (id) => api.get(`/pricing/${id}`);
export const createPricingRule = (data) => api.post('/pricing', data);
export const updatePricingRule = (id, data) => api.put(`/pricing/${id}`, data);
export const deletePricingRule = (id) => api.delete(`/pricing/${id}`);

// Transfers
export const getTransfers = () => api.get('/transfers');
export const getTransfer = (id) => api.get(`/transfers/${id}`);
export const createTransfer = (data) => api.post('/transfers', data);
export const updateTransfer = (id, data) => api.put(`/transfers/${id}`, data);
export const patchTransfer = (id, data) => api.patch(`/transfers/${id}`, data);

// Notifications
export const getNotifications = () => api.get('/notifications?_sort=createdAt&_order=desc');
export const getNotificationsByUser = (userId) => api.get(`/notifications?userId=${userId}&_sort=createdAt&_order=desc`);
export const createNotification = (data) => api.post('/notifications', data);
export const updateNotification = (id, data) => api.patch(`/notifications/${id}`, data);

// Activities
export const getActivities = () => api.get('/activities?_sort=timestamp&_order=desc');
export const createActivity = (data) => api.post('/activities', data);

export default api;
