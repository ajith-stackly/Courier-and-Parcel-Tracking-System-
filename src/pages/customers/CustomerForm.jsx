import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { getCustomer, getCustomers, getUsers, createUser, updateUser, createCustomer, patchCustomer } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { validateForm } from '../../utils/validators';
import { INDIAN_STATES } from '../../utils/constants';
import LoadingSpinner from '../../components/LoadingSpinner';

const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [errors, setErrors] = useState({});
  const [initialPassword, setInitialPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const fetchCustomer = async () => {
        try {
          setFetching(true);
          const response = await getCustomer(id);
          const c = response.data;
          setFormData({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            state: c.state || '',
            pincode: c.pincode || '',
          });
        } catch (err) {
          toast.error('Failed to load customer');
          navigate('/customers');
        } finally {
          setFetching(false);
        }
      };
      fetchCustomer();
    }
  }, [id, isEditMode, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validationRules = {
    name: [{ required: true, message: 'Name is required' }],
    email: [
      { required: true, message: 'Email is required' },
      { email: true, message: 'Invalid email address' },
    ],
    phone: [
      { required: true, message: 'Phone is required' },
      { phone: true, message: 'Invalid phone number (10 digits starting with 6-9)' },
    ],
    address: [{ required: true, message: 'Address is required' }],
    city: [{ required: true, message: 'City is required' }],
    state: [{ required: true, message: 'State is required' }],
    pincode: [
      { required: true, message: 'Pincode is required' },
      { pincode: true, message: 'Invalid pincode (6 digits)' },
    ],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(formData, validationRules);
    if (!isEditMode && initialPassword.length < 8) {
      validationErrors.password = 'Password must be at least 8 characters';
    }
    if (!isValid || validationErrors.password) {
      setErrors(validationErrors);
      if (validationErrors.password) toast.error(validationErrors.password);
      return;
    }

    let customerSaved = false;
    try {
      setSubmitting(true);
      const [customersResponse, usersResponse] = await Promise.all([getCustomers(), getUsers()]);
      const email = formData.email.trim().toLowerCase();
      const duplicateCustomer = customersResponse.data.some(customer =>
        String(customer.id) !== String(id) && customer.email?.trim().toLowerCase() === email
      );
      if (duplicateCustomer) {
        toast.error('A customer with this email already exists');
        return;
      }

      let currentCustomer = null;
      let linkedUser = null;
      if (isEditMode) {
        currentCustomer = (await getCustomer(id)).data;
        linkedUser = usersResponse.data.find(user =>
          currentCustomer.userId != null && String(user.id) === String(currentCustomer.userId)
        ) || usersResponse.data.find(user =>
          user.role === 'customer' && user.email?.trim().toLowerCase() === currentCustomer.email?.trim().toLowerCase()
        ) || null;
      }

      const duplicateUser = usersResponse.data.some(user =>
        String(user.id) !== String(linkedUser?.id) && user.email?.trim().toLowerCase() === email
      );
      if (duplicateUser) {
        toast.error('A user with this email already exists');
        return;
      }

      const customerData = { ...formData, email: formData.email.trim() };
      if (isEditMode) {
        await patchCustomer(id, {
          ...customerData,
          ...(linkedUser ? { userId: linkedUser.id } : {}),
        });
        customerSaved = true;
        if (linkedUser) {
          await updateUser(linkedUser.id, {
            ...linkedUser,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            customerId: currentCustomer.id,
          });
        }
        toast.success('Customer updated successfully');
      } else {
        const userResponse = await createUser({
          name: customerData.name,
          email: customerData.email,
          password: initialPassword,
          role: 'customer',
          phone: customerData.phone,
        });
        const customerResponse = await createCustomer({
          ...customerData,
          userId: userResponse.data.id,
          createdAt: new Date().toISOString(),
        });
        await updateUser(userResponse.data.id, {
          ...userResponse.data,
          customerId: customerResponse.data.id,
        });
        toast.success('Customer created successfully');
      }
      navigate('/customers');
    } catch (err) {
      console.error('Customer save failed:', err);
      toast.error(customerSaved
        ? 'Customer was saved, but the linked login account could not be updated'
        : isEditMode ? 'Failed to update customer' : 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) return <LoadingSpinner text="Loading customer..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Edit Customer' : 'Add Customer'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? 'Update customer information' : 'Create a new customer record'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`input-field w-full ${errors.email ? 'border-red-500' : ''}`}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {!isEditMode && (
            <div>
              <label className="label">Initial Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                name="initialPassword"
                value={initialPassword}
                onChange={(e) => {
                  setInitialPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: undefined }));
                }}
                minLength={8}
                autoComplete="new-password"
                className={`input-field w-full ${errors.password ? 'border-red-500' : ''}`}
                placeholder="At least 8 characters"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="label">Phone <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`input-field w-full ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="Enter 10-digit phone number"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Pincode */}
          <div>
            <label className="label">Pincode <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              className={`input-field w-full ${errors.pincode ? 'border-red-500' : ''}`}
              placeholder="Enter 6-digit pincode"
            />
            {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
          </div>

          {/* Address (full width) */}
          <div className="md:col-span-2">
            <label className="label">Address <span className="text-red-500">*</span></label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={`input-field w-full ${errors.address ? 'border-red-500' : ''}`}
              placeholder="Enter full address"
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          {/* City */}
          <div>
            <label className="label">City <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`input-field w-full ${errors.city ? 'border-red-500' : ''}`}
              placeholder="Enter city"
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>

          {/* State */}
          <div>
            <label className="label">State <span className="text-red-500">*</span></label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className={`input-field w-full ${errors.state ? 'border-red-500' : ''}`}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
            <FiSave size={16} />
            {submitting ? 'Saving...' : isEditMode ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
