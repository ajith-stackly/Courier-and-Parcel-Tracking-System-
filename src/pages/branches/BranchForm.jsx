import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { getBranch, getBranches, createBranch, updateBranch } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { validateForm } from '../../utils/validators';
import { INDIAN_STATES } from '../../utils/constants';
import LoadingSpinner from '../../components/LoadingSpinner';

const BranchForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    contact: '',
    manager: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});
  const [fetching, setFetching] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const fetchBranch = async () => {
        try {
          setFetching(true);
          const response = await getBranch(id);
          const b = response.data;
          setFormData({
            name: b.name || '',
            code: b.code || '',
            address: b.address || '',
            city: b.city || '',
            state: b.state || '',
            contact: b.contact || '',
            manager: b.manager || '',
            status: b.status || 'active',
          });
        } catch (err) {
          toast.error('Failed to load branch');
          navigate('/branches');
        } finally {
          setFetching(false);
        }
      };
      fetchBranch();
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
    name: [{ required: true, message: 'Branch name is required' }],
    code: [{ required: true, message: 'Branch code is required' }],
    address: [{ required: true, message: 'Address is required' }],
    city: [{ required: true, message: 'City is required' }],
    state: [{ required: true, message: 'State is required' }],
    contact: [
      { required: true, message: 'Contact number is required' },
      { phone: true, message: 'Invalid contact number (10 digits starting with 6-9)' },
    ],
    manager: [{ required: true, message: 'Manager name is required' }],
    status: [{ required: true, message: 'Status is required' }],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(formData, validationRules);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      const branchesResponse = await getBranches();
      const code = formData.code.trim().toLowerCase();
      const duplicateCode = branchesResponse.data.some(branch =>
        String(branch.id) !== String(id) && branch.code?.trim().toLowerCase() === code
      );
      if (duplicateCode) {
        toast.error('A branch with this code already exists');
        return;
      }

      const branchData = { ...formData, code: formData.code.trim() };
      if (isEditMode) {
        await updateBranch(id, branchData);
        toast.success('Branch updated successfully');
      } else {
        await createBranch({ ...branchData, createdAt: new Date().toISOString() });
        toast.success('Branch created successfully');
      }
      navigate('/branches');
    } catch (err) {
      toast.error(isEditMode ? 'Failed to update branch' : 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) return <LoadingSpinner text="Loading branch..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center gap-4">
        <button onClick={() => navigate('/branches')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Edit Branch' : 'Add Branch'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? 'Update branch information' : 'Create a new branch'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="label">Branch Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter branch name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Code */}
          <div>
            <label className="label">Branch Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className={`input-field w-full ${errors.code ? 'border-red-500' : ''}`}
              placeholder="e.g., MUM-001"
            />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
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

          {/* Contact */}
          <div>
            <label className="label">Contact Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className={`input-field w-full ${errors.contact ? 'border-red-500' : ''}`}
              placeholder="Enter 10-digit contact number"
            />
            {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
          </div>

          {/* Manager */}
          <div>
            <label className="label">Manager <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              className={`input-field w-full ${errors.manager ? 'border-red-500' : ''}`}
              placeholder="Enter manager name"
            />
            {errors.manager && <p className="text-red-500 text-xs mt-1">{errors.manager}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="label">Status <span className="text-red-500">*</span></label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`input-field w-full ${errors.status ? 'border-red-500' : ''}`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/branches')}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
            <FiSave size={16} />
            {submitting ? 'Saving...' : isEditMode ? 'Update Branch' : 'Create Branch'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BranchForm;
