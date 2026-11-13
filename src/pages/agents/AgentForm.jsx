import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { getAgent, getAgents, getUsers, createUser, updateUser, createAgent, updateAgent, getBranches } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { validateForm } from '../../utils/validators';
import { VEHICLE_TYPES, AGENT_AVAILABILITY } from '../../utils/constants';
import LoadingSpinner from '../../components/LoadingSpinner';

const AVAILABILITY_LABELS = {
  available: 'Available',
  on_delivery: 'On Delivery',
  off_duty: 'Off Duty',
};

const AgentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: '',
    vehicleNumber: '',
    vehicleType: '',
    availability: 'available',
  });
  const [branches, setBranches] = useState([]);
  const [errors, setErrors] = useState({});
  const [initialPassword, setInitialPassword] = useState('');
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const branchesRes = await getBranches();
        setBranches(branchesRes.data);

        if (isEditMode) {
          const agentRes = await getAgent(id);
          const a = agentRes.data;
          setFormData({
            name: a.name || '',
            email: a.email || '',
            phone: a.phone || '',
            branchId: a.branchId || '',
            vehicleNumber: a.vehicleNumber || '',
            vehicleType: a.vehicleType || '',
            availability: a.availability || 'available',
          });
        }
      } catch (err) {
        toast.error('Failed to load data');
        navigate('/agents');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
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
    branchId: [{ required: true, message: 'Branch is required' }],
    vehicleType: [{ required: true, message: 'Vehicle type is required' }],
    vehicleNumber: [{ required: true, message: 'Vehicle number is required' }],
    availability: [{ required: true, message: 'Availability is required' }],
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

    let agentSaved = false;
    try {
      setSubmitting(true);
      const [agentsResponse, usersResponse] = await Promise.all([getAgents(), getUsers()]);
      const email = formData.email.trim().toLowerCase();
      const duplicateAgent = agentsResponse.data.some(agent =>
        String(agent.id) !== String(id) && agent.email?.trim().toLowerCase() === email
      );
      if (duplicateAgent) {
        toast.error('An agent with this email already exists');
        return;
      }

      let currentAgent = null;
      let linkedUser = null;
      if (isEditMode) {
        currentAgent = (await getAgent(id)).data;
        linkedUser = usersResponse.data.find(user =>
          currentAgent.userId != null && String(user.id) === String(currentAgent.userId)
        ) || usersResponse.data.find(user =>
          user.role === 'delivery_agent' && user.email?.trim().toLowerCase() === currentAgent.email?.trim().toLowerCase()
        ) || null;
      }

      const duplicateUser = usersResponse.data.some(user =>
        String(user.id) !== String(linkedUser?.id) && user.email?.trim().toLowerCase() === email
      );
      if (duplicateUser) {
        toast.error('A user with this email already exists');
        return;
      }

      const agentData = { ...formData, email: formData.email.trim(), branchId: parseInt(formData.branchId, 10) };
      if (isEditMode) {
        await updateAgent(id, {
          ...agentData,
          ...(linkedUser ? { userId: linkedUser.id } : {}),
        });
        agentSaved = true;
        if (linkedUser) {
          await updateUser(linkedUser.id, {
            ...linkedUser,
            name: agentData.name,
            email: agentData.email,
            phone: agentData.phone,
            agentId: currentAgent.id,
          });
        }
        toast.success('Agent updated successfully');
      } else {
        const userResponse = await createUser({
          name: agentData.name,
          email: agentData.email,
          password: initialPassword,
          role: 'delivery_agent',
          phone: agentData.phone,
        });
        const agentResponse = await createAgent({
          ...agentData,
          userId: userResponse.data.id,
          createdAt: new Date().toISOString(),
        });
        await updateUser(userResponse.data.id, {
          ...userResponse.data,
          agentId: agentResponse.data.id,
        });
        toast.success('Agent created successfully');
      }
      navigate('/agents');
    } catch (error) {
      console.error('Agent save failed:', error);
      toast.error(agentSaved
        ? 'Agent was saved, but the linked login account could not be updated'
        : isEditMode ? 'Failed to update agent' : 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) return <LoadingSpinner text="Loading..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center gap-4">
        <button onClick={() => navigate('/agents')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Edit Agent' : 'Add Agent'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? 'Update delivery agent information' : 'Register a new delivery agent'}
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

          {/* Branch */}
          <div>
            <label className="label">Branch <span className="text-red-500">*</span></label>
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              className={`input-field w-full ${errors.branchId ? 'border-red-500' : ''}`}
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            {errors.branchId && <p className="text-red-500 text-xs mt-1">{errors.branchId}</p>}
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="label">Vehicle Type <span className="text-red-500">*</span></label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className={`input-field w-full ${errors.vehicleType ? 'border-red-500' : ''}`}
            >
              <option value="">Select Vehicle Type</option>
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.vehicleType && <p className="text-red-500 text-xs mt-1">{errors.vehicleType}</p>}
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="label">Vehicle Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              className={`input-field w-full ${errors.vehicleNumber ? 'border-red-500' : ''}`}
              placeholder="e.g., MH-01-AB-1234"
            />
            {errors.vehicleNumber && <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber}</p>}
          </div>

          {/* Availability */}
          <div>
            <label className="label">Availability <span className="text-red-500">*</span></label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              className={`input-field w-full ${errors.availability ? 'border-red-500' : ''}`}
            >
              {AGENT_AVAILABILITY.map((a) => (
                <option key={a} value={a}>{AVAILABILITY_LABELS[a] || a}</option>
              ))}
            </select>
            {errors.availability && <p className="text-red-500 text-xs mt-1">{errors.availability}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
            <FiSave size={16} />
            {submitting ? 'Saving...' : isEditMode ? 'Update Agent' : 'Create Agent'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgentForm;
