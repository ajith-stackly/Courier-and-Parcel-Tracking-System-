import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getShipment, getShipmentByTracking, patchShipment, createShipment,
  getBranches, getPricing, getCustomers, getCustomer, getParcels,
  createTrackingEntry, createPayment, createActivity,
} from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { validateForm } from '../../utils/validators';
import { DELIVERY_TYPES, INDIAN_STATES, PAYMENT_METHODS } from '../../utils/constants';
import { canAccessShipment, generateTrackingNumber, calculateDeliveryCharge, formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { createShipmentNotifications } from '../../utils/notifications';
import { FiArrowLeft, FiSave, FiPackage } from 'react-icons/fi';

const InputField = ({ label, name, type = 'text', inputMode, placeholder, required, value, error, onChange }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <input type={type} inputMode={inputMode} name={name} value={value} onChange={onChange} placeholder={placeholder}
      autoComplete="off"
      className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''}`} />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const SelectField = ({ label, name, options, required, placeholder = 'Select...', value, error, onChange }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <select name={name} value={value} onChange={onChange}
      className={`input-field ${error ? 'border-red-400' : ''}`}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const ShipmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [calculatedCharge, setCalculatedCharge] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [confirmPrice, setConfirmPrice] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const [form, setForm] = useState({
    senderName: '', senderPhone: '', senderAddress: '', senderCity: '', senderState: '', senderPincode: '',
    receiverName: '', receiverPhone: '', receiverAddress: '', receiverCity: '', receiverState: '', receiverPincode: '',
    parcelType: 'Document', weight: '', length: '', width: '', height: '',
    deliveryType: 'Standard', originBranchId: '', destinationBranchId: '',
    customerId: '', expectedDeliveryDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, pRes, cRes, parcelRes] = await Promise.all([getBranches(), getPricing(), getCustomers(), getParcels()]);
        setBranches(bRes.data.filter(b => b.status === 'active'));
        setPricing(pRes.data);
        setCustomers(cRes.data);
        setParcels(parcelRes.data);

        if (user.role === 'customer' && user.customerId) {
          const custRes = await getCustomer(user.customerId);
          const cust = custRes.data;
          setForm(prev => ({
            ...prev,
            customerId: cust.id,
            senderName: cust.name,
            senderPhone: cust.phone,
            senderAddress: cust.address,
            senderCity: cust.city,
            senderState: cust.state,
            senderPincode: cust.pincode,
          }));
        }

        if (isEdit) {
          const sRes = await getShipment(id);
          const s = sRes.data;
          if (!canAccessShipment(user, s)) {
            setUnauthorized(true);
            return;
          }
          setForm({
            senderName: s.senderName, senderPhone: s.senderPhone, senderAddress: s.senderAddress,
            senderCity: s.senderCity, senderState: s.senderState, senderPincode: s.senderPincode,
            receiverName: s.receiverName, receiverPhone: s.receiverPhone, receiverAddress: s.receiverAddress,
            receiverCity: s.receiverCity, receiverState: s.receiverState, receiverPincode: s.receiverPincode,
            parcelType: s.parcelType, weight: s.weight, length: s.length, width: s.width, height: s.height,
            deliveryType: s.deliveryType, originBranchId: s.originBranchId, destinationBranchId: s.destinationBranchId,
            customerId: s.customerId, expectedDeliveryDate: s.expectedDeliveryDate,
          });
          setCalculatedCharge(s.deliveryCharge);
        }
      } catch (err) { toast.error('Failed to load form data'); }
      finally { setLoading(false); }
    };
    setLoading(true);
    setUnauthorized(false);
    fetchData();
  }, [id, isEdit, user]);

  useEffect(() => {
    if (form.weight && form.deliveryType && pricing.length > 0) {
      const charge = calculateDeliveryCharge(pricing, form.deliveryType, parseFloat(form.weight));
      setCalculatedCharge(charge);
    }
  }, [form.weight, form.deliveryType, pricing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const getExpectedDate = (type) => {
    const d = new Date();
    if (type === 'Same Day') d.setDate(d.getDate());
    else if (type === 'Express') d.setDate(d.getDate() + 3);
    else d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const getUniqueTrackingNumber = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const trackingNumber = generateTrackingNumber();
      const existing = await getShipmentByTracking(trackingNumber);
      if (existing.data.length === 0) return trackingNumber;
    }
    throw new Error('Could not generate a unique tracking number');
  };

  const saveShipment = async () => {
    setSaving(true);
    try {
      const expDate = form.expectedDeliveryDate || getExpectedDate(form.deliveryType);
      const now = new Date().toISOString();
      const selectedParcel = parcels.find(parcel => (parcel.name || parcel.type) === form.parcelType);
      const shipmentData = {
        customerId: form.customerId || null,
        senderName: form.senderName, senderPhone: form.senderPhone,
        senderAddress: form.senderAddress, senderCity: form.senderCity,
        senderState: form.senderState, senderPincode: form.senderPincode,
        receiverName: form.receiverName, receiverPhone: form.receiverPhone,
        receiverAddress: form.receiverAddress, receiverCity: form.receiverCity,
        receiverState: form.receiverState, receiverPincode: form.receiverPincode,
        parcelId: selectedParcel?.id,
        parcelType: form.parcelType, weight: parseFloat(form.weight),
        length: parseFloat(form.length) || 0, width: parseFloat(form.width) || 0, height: parseFloat(form.height) || 0,
        deliveryType: form.deliveryType,
        originBranchId: parseInt(form.originBranchId),
        destinationBranchId: parseInt(form.destinationBranchId),
        expectedDeliveryDate: expDate,
        deliveryCharge: calculatedCharge,
      };

      if (isEdit) {
        await patchShipment(id, shipmentData);
        toast.success('Shipment updated successfully');
      } else {
        const trackingNumber = await getUniqueTrackingNumber();
        const shipmentDataForCreate = {
          ...shipmentData,
          trackingNumber,
          status: 'Shipment Created',
          currentBranchId: parseInt(form.originBranchId),
          agentId: null,
          actualDeliveryDate: null,
          createdAt: now,
        };
        const sRes = await createShipment(shipmentDataForCreate);
        const newShipment = sRes.data;
        const originBranch = branches.find(b => b.id === parseInt(form.originBranchId));
        try {
          await Promise.all([
            createTrackingEntry({
              shipmentId: newShipment.id,
              trackingNumber,
              status: 'Shipment Created',
              location: originBranch?.name || 'Origin Branch',
              branchId: parseInt(form.originBranchId),
              remarks: 'Shipment booked',
              timestamp: now,
              updatedBy: user.name,
            }),
            createPayment({
              shipmentId: newShipment.id,
              trackingNumber,
              customerId: form.customerId || null,
              amount: calculatedCharge,
              date: now,
              method: paymentMethod,
              status: 'Pending',
              transactionRef: `TXN${Date.now()}`,
            }),
            createActivity({
              type: 'shipment_created',
              message: `Shipment ${trackingNumber} created by ${user.name}`,
              userId: user.id,
              entityType: 'shipment',
              entityId: newShipment.id,
              timestamp: now,
            }),
            createShipmentNotifications(newShipment, `Shipment ${trackingNumber} created`, user),
            createShipmentNotifications(newShipment, `Payment pending for shipment ${trackingNumber}`, user),
          ]);
        } catch {
          toast.error('Shipment was created, but one or more tracking, payment, or notification records could not be saved.');
          navigate('/shipments');
          return;
        }
        toast.success(`Shipment created! Tracking: ${trackingNumber}`);
      }
      navigate('/shipments');
    } catch {
      toast.error(isEdit ? 'Failed to update shipment' : 'Failed to create shipment');
    } finally { setSaving(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rules = {
      senderName: [{ required: true, message: 'Sender name required' }],
      senderPhone: [{ required: true }, { phone: true }],
      senderAddress: [{ required: true, message: 'Sender address required' }],
      senderCity: [{ required: true, message: 'Sender city required' }],
      senderState: [{ required: true, message: 'Sender state required' }],
      senderPincode: [{ required: true }, { pincode: true }],
      receiverName: [{ required: true, message: 'Receiver name required' }],
      receiverPhone: [{ required: true }, { phone: true }],
      receiverAddress: [{ required: true, message: 'Receiver address required' }],
      receiverCity: [{ required: true, message: 'Receiver city required' }],
      receiverState: [{ required: true, message: 'Receiver state required' }],
      receiverPincode: [{ required: true }, { pincode: true }],
      weight: [{ required: true }, { weight: true }],
      length: [{ dimension: true }],
      width: [{ dimension: true }],
      height: [{ dimension: true }],
      originBranchId: [{ required: true, message: 'Origin branch required' }],
      destinationBranchId: [{ required: true, message: 'Destination branch required' }],
    };
    const { isValid, errors: validationErrors } = validateForm(form, rules);
    if (!isValid) {
      setErrors(validationErrors);
      toast.error('Please fix form errors');
      return;
    }
    if (String(form.originBranchId) === String(form.destinationBranchId)) {
      setErrors(prev => ({
        ...prev,
        originBranchId: 'Origin and destination branches must be different',
        destinationBranchId: 'Origin and destination branches must be different',
      }));
      toast.error('Origin and destination branches cannot be the same');
      return;
    }

    if (isEdit) {
      await saveShipment();
    } else {
      setConfirmPrice(true);
    }
  };

  if (unauthorized) return <Navigate to="/unauthorized" replace />;
  if (loading) return <LoadingSpinner />;

  const stateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));
  const branchOptions = branches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }));
  const parcelOptions = parcels.map(parcel => ({
    value: parcel.name || parcel.type,
    label: parcel.name || parcel.type,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/shipments')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><FiArrowLeft size={20} /></button>
        <h1 className="page-header mb-0">{isEdit ? 'Edit Shipment' : 'Create New Shipment'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer selection (admin/staff) */}
        {user.role !== 'customer' && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Customer</h2>
            <div>
              <label className="label">Link to Customer (optional)</label>
              <select name="customerId" value={form.customerId} onChange={handleChange} className="input-field">
                <option value="">Walk-in / No customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} – {c.phone}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Sender Details */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Sender Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputField label="Sender Name" name="senderName" value={form.senderName} error={errors.senderName} onChange={handleChange} required placeholder="Full name" />
            <InputField label="Sender Phone" name="senderPhone" value={form.senderPhone} error={errors.senderPhone} onChange={handleChange} required placeholder="10-digit number" />
            <InputField label="Sender Pincode" name="senderPincode" value={form.senderPincode} error={errors.senderPincode} onChange={handleChange} required placeholder="6-digit pincode" />
            <div className="sm:col-span-2 lg:col-span-3">
              <InputField label="Sender Address" name="senderAddress" value={form.senderAddress} error={errors.senderAddress} onChange={handleChange} required placeholder="Door no, Street, Area" />
            </div>
            <InputField label="City" name="senderCity" value={form.senderCity} error={errors.senderCity} onChange={handleChange} required placeholder="City" />
            <SelectField label="State" name="senderState" value={form.senderState} error={errors.senderState} onChange={handleChange} required options={stateOptions} placeholder="Select State" />
          </div>
        </div>

        {/* Receiver Details */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Receiver Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputField label="Receiver Name" name="receiverName" value={form.receiverName} error={errors.receiverName} onChange={handleChange} required placeholder="Full name" />
            <InputField label="Receiver Phone" name="receiverPhone" value={form.receiverPhone} error={errors.receiverPhone} onChange={handleChange} required placeholder="10-digit number" />
            <InputField label="Receiver Pincode" name="receiverPincode" value={form.receiverPincode} error={errors.receiverPincode} onChange={handleChange} required placeholder="6-digit pincode" />
            <div className="sm:col-span-2 lg:col-span-3">
              <InputField label="Receiver Address" name="receiverAddress" value={form.receiverAddress} error={errors.receiverAddress} onChange={handleChange} required placeholder="Door no, Street, Area" />
            </div>
            <InputField label="City" name="receiverCity" value={form.receiverCity} error={errors.receiverCity} onChange={handleChange} required placeholder="City" />
            <SelectField label="State" name="receiverState" value={form.receiverState} error={errors.receiverState} onChange={handleChange} required options={stateOptions} placeholder="Select State" />
          </div>
        </div>

        {/* Parcel Details */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Parcel Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectField label="Parcel Type" name="parcelType" value={form.parcelType} error={errors.parcelType} onChange={handleChange} options={parcelOptions} required />
            <InputField label="Weight (kg)" name="weight" value={form.weight} error={errors.weight} onChange={handleChange} type="text" inputMode="decimal" required placeholder="e.g. 2.5" />
            <InputField label="Length (cm)" name="length" value={form.length} error={errors.length} onChange={handleChange} type="text" inputMode="decimal" placeholder="optional" />
            <InputField label="Width (cm)" name="width" value={form.width} error={errors.width} onChange={handleChange} type="text" inputMode="decimal" placeholder="optional" />
            <InputField label="Height (cm)" name="height" value={form.height} error={errors.height} onChange={handleChange} type="text" inputMode="decimal" placeholder="optional" />
          </div>
        </div>

        {/* Delivery & Branch */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Delivery & Branch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Delivery Type <span className="text-red-500">*</span></label>
              <select name="deliveryType" value={form.deliveryType} onChange={handleChange} className="input-field">
                {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <SelectField label="Origin Branch" name="originBranchId" value={form.originBranchId} error={errors.originBranchId} onChange={handleChange} required options={branchOptions} placeholder="Select origin branch" />
            <SelectField label="Destination Branch" name="destinationBranchId" value={form.destinationBranchId} error={errors.destinationBranchId} onChange={handleChange} required options={branchOptions} placeholder="Select destination branch" />
            <div>
              <label className="label">Expected Delivery Date</label>
              <input type="date" name="expectedDeliveryDate" value={form.expectedDeliveryDate} onChange={handleChange}
                min={new Date().toISOString().split('T')[0]} className="input-field" />
            </div>
          </div>
        </div>

        {/* Payment & Charge */}
        {!isEdit && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Payment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Delivery Charge</label>
                <div className="flex items-center gap-3">
                  <div className="input-field bg-gray-50 font-semibold text-gray-700 flex items-center">
                    <FiPackage size={16} className="mr-2 text-gray-400" /> {formatCurrency(calculatedCharge)}
                  </div>
                  {form.weight && form.deliveryType && (
                    <span className="text-xs text-gray-500">({form.deliveryType}, {form.weight}kg)</span>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/shipments')}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <FiSave size={16} /> {saving ? 'Saving...' : (isEdit ? 'Update Shipment' : 'Create Shipment')}
          </button>
        </div>
      </form>

      <Modal isOpen={confirmPrice} onClose={() => !saving && setConfirmPrice(false)} title="Confirm Shipment Price">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Review the shipment details and delivery charge before creating this shipment.</p>
          <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Route</span>
              <span className="font-medium text-right">{form.senderCity} → {form.receiverCity}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Delivery</span>
              <span className="font-medium">{form.deliveryType}, {form.weight} kg</span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-2">
              <span className="font-semibold text-gray-700">Delivery charge</span>
              <span className="font-bold text-gray-900">{formatCurrency(calculatedCharge)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setConfirmPrice(false)}>Back</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={saveShipment}>
              {saving ? 'Creating...' : 'Confirm and Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShipmentForm;
