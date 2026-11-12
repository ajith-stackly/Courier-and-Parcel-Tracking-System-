export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  
export const ROLES = {
  ADMIN: 'admin',
  BRANCH_STAFF: 'branch_staff',
  DELIVERY_AGENT: 'delivery_agent',
  CUSTOMER: 'customer',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  branch_staff: 'Branch Staff',
  delivery_agent: 'Delivery Agent',
  customer: 'Customer',
};

export const SHIPMENT_STATUSES = [
  'Shipment Created',
  'Branch Received',
  'Processing',
  'In Transit',
  'Arrived at Destination',
  'Agent Assigned',
  'Accepted',
  'Out for Delivery',
  'Delivered',
  'Delivery Failed',
  'Return Initiated',
  'In Transit (Return)',
  'Cancelled',
  'Returned to Sender',
];

export const CANCELLABLE_STATUSES = [
  'Shipment Created',
  'Branch Received',
  'Processing',
];

export const STATUS_FLOW = {
  'Shipment Created': ['Branch Received', 'Cancelled'],
  'Branch Received': ['Processing', 'Cancelled'],
  'Processing': ['In Transit', 'Cancelled'],
  'In Transit': ['Arrived at Destination', 'Returned to Sender'],
  'Arrived at Destination': ['Agent Assigned', 'In Transit'],
  'Agent Assigned': ['Accepted'],
  'Accepted': ['Out for Delivery'],
  'Out for Delivery': ['Delivered', 'Delivery Failed'],
  'Delivered': [],
  'Delivery Failed': ['Return Initiated', 'Out for Delivery'],
  'Cancelled': [],
  'Return Initiated': ['In Transit'],
  'In Transit (Return)': ['Returned to Sender'],
  'Returned to Sender': [],
};

export const STATUS_COLORS = {
  'Shipment Created': { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  'Branch Received': { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  'Processing': { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  'In Transit': { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Arrived at Destination': { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  'Agent Assigned': { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
  'Accepted': { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
  'Out for Delivery': { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Delivered': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  'Delivery Failed': { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
  'Return Initiated': { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  'In Transit (Return)': { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Returned to Sender': { bg: 'bg-rose-100', text: 'text-rose-800', dot: 'bg-rose-500' },
};

export const DELIVERY_TYPES = ['Standard', 'Express', 'Same Day'];

export const PARCEL_TYPES = ['Document', 'Electronics', 'Clothing', 'Food', 'Fragile', 'Furniture', 'Medicine', 'Other'];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Wallet'];

export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

export const VEHICLE_TYPES = ['Bike', 'Van', 'Truck', 'Auto'];

export const AGENT_AVAILABILITY = ['available', 'on_delivery', 'off_duty'];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];
