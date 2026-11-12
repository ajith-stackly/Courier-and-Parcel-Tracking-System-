import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPricingRule, createPricingRule, updatePricingRule } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DELIVERY_TYPES } from '../../utils/constants';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

const PricingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const prevDeliveryType = useRef('Standard');

  const descriptions = {
    'Standard': 'Standard delivery (5-7 days)',
    'Express': 'Express delivery (2-3 days)',
    'Same Day': 'Same day delivery',
  };

  const [form, setForm] = useState({
    deliveryType: 'Standard',
    minWeight: '',
    maxWeight: '',
    basePrice: '',
    pricePerKg: '',
    description: 'Standard delivery (5-7 days)',
  });

  useEffect(() => {
    if (isEdit) {
      getPricingRule(id)
        .then(res => {
          const r = res.data;
          setForm({
            deliveryType: r.deliveryType,
            minWeight: String(r.minWeight),
            maxWeight: String(r.maxWeight),
            basePrice: String(r.basePrice),
            pricePerKg: String(r.pricePerKg),
            description: r.description,
          });
          prevDeliveryType.current = r.deliveryType;
        })
        .catch(() => toast.error('Failed to load'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Only auto-update description when delivery type changes
      if (name === 'deliveryType' && value !== prevDeliveryType.current) {
        prevDeliveryType.current = value;
        updated.description = descriptions[value] || '';
      }
      return updated;
    });
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.deliveryType) errs.deliveryType = 'Required';
    if (form.minWeight === '' || isNaN(Number(form.minWeight)) || Number(form.minWeight) < 0)
      errs.minWeight = 'Enter a valid min weight (≥ 0)';
    if (!form.maxWeight || isNaN(Number(form.maxWeight)) || Number(form.maxWeight) <= Number(form.minWeight))
      errs.maxWeight = 'Must be greater than min weight';
    if (!form.basePrice || isNaN(Number(form.basePrice)) || Number(form.basePrice) < 0)
      errs.basePrice = 'Enter a valid base price';
    if (!form.pricePerKg || isNaN(Number(form.pricePerKg)) || Number(form.pricePerKg) < 0)
      errs.pricePerKg = 'Enter a valid price per kg';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const data = {
        deliveryType: form.deliveryType,
        minWeight: parseFloat(form.minWeight),
        maxWeight: parseFloat(form.maxWeight),
        basePrice: parseFloat(form.basePrice),
        pricePerKg: parseFloat(form.pricePerKg),
        description: form.description,
      };
      if (isEdit) {
        await updatePricingRule(id, data);
        toast.success('Pricing rule updated');
      } else {
        await createPricingRule(data);
        toast.success('Pricing rule created');
      }
      navigate('/pricing');
    } catch {
      toast.error('Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // NumField now uses type="text" with inputMode="decimal" to avoid browser number-input quirks
  const NumField = ({ label, name, placeholder }) => (
    <div>
      <label className="label">{label} <span className="text-red-500">*</span></label>
      <input
        type="text"
        inputMode="decimal"
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        className={`input-field ${errors[name] ? 'border-red-400 focus:ring-red-400' : ''}`}
      />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
    </div>
  );

  const example = form.basePrice && form.pricePerKg && !isNaN(Number(form.basePrice)) && !isNaN(Number(form.pricePerKg))
    ? (Number(form.basePrice) + 2 * Number(form.pricePerKg)).toFixed(0)
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pricing')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="page-header mb-0">{isEdit ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h1>
      </div>

      <div className="card max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Delivery Type <span className="text-red-500">*</span></label>
            <select name="deliveryType" value={form.deliveryType} onChange={handleChange} className="input-field">
              {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumField label="Min Weight (kg)" name="minWeight" placeholder="e.g. 0" />
            <NumField label="Max Weight (kg)" name="maxWeight" placeholder="e.g. 5" />
            <NumField label="Base Price (₹)" name="basePrice" placeholder="e.g. 100" />
            <NumField label="Price per Kg (₹)" name="pricePerKg" placeholder="e.g. 50" />
          </div>

          <div>
            <label className="label">Description</label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. Standard delivery (5-7 days)"
            />
          </div>

          {example && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              💡 Example charge for 2 kg: <strong>₹{example}</strong>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/pricing')}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSave size={16} /> {saving ? 'Saving...' : (isEdit ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PricingForm;
