import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPayment, getPaymentByShipment, createPayment, patchPayment, getShipments } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/constants';
import { formatCurrency } from '../../utils/helpers';
import { createShipmentNotifications } from '../../utils/notifications';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

const PaymentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    shipmentId: '', amount: '', method: 'Cash', status: 'Pending', transactionRef: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sRes = await getShipments();
        setShipments(sRes.data);
        if (isEdit) {
          const pRes = await getPayment(id);
          const p = pRes.data;
          setForm({ shipmentId: p.shipmentId, amount: p.amount, method: p.method, status: p.status, transactionRef: p.transactionRef || '' });
        }
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, isEdit]);

  // Auto-fill amount when shipment selected
  useEffect(() => {
    if (form.shipmentId && !isEdit) {
      const sel = shipments.find(s => s.id === parseInt(form.shipmentId));
      if (sel) setForm(prev => ({ ...prev, amount: sel.deliveryCharge }));
    }
  }, [form.shipmentId, shipments, isEdit]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.shipmentId) errs.shipmentId = 'Select a shipment';
    if (!form.amount || isNaN(form.amount)) errs.amount = 'Valid amount required';
    if (!form.method) errs.method = 'Select payment method';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const sel = shipments.find(s => s.id === parseInt(form.shipmentId));
      if (!sel) {
        toast.error('The selected shipment could not be found');
        return;
      }
      const paymentData = {
        shipmentId: parseInt(form.shipmentId),
        trackingNumber: sel?.trackingNumber || '',
        customerId: sel?.customerId || null,
        amount: parseFloat(form.amount),
        date: new Date().toISOString(),
        method: form.method,
        status: form.status,
        transactionRef: form.transactionRef || `TXN${Date.now()}`,
      };

      if (isEdit) {
        await patchPayment(id, paymentData);
      } else {
        await createPayment(paymentData);
      }
      await createShipmentNotifications(sel, `Payment ${paymentData.status.toLowerCase()} for shipment ${sel.trackingNumber}`, user);
      toast.success(isEdit ? 'Payment updated' : 'Payment created');
      navigate('/payments');
    } catch { toast.error('Failed to save payment'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  const selectedShipment = shipments.find(s => s.id === parseInt(form.shipmentId));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/payments')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><FiArrowLeft size={20} /></button>
        <h1 className="page-header mb-0">{isEdit ? 'Edit Payment' : 'New Payment'}</h1>
      </div>

      <div className="card max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Shipment <span className="text-red-500">*</span></label>
            <select name="shipmentId" value={form.shipmentId} onChange={handleChange}
              className={`input-field ${errors.shipmentId ? 'border-red-400' : ''}`} disabled={isEdit}>
              <option value="">Select shipment...</option>
              {shipments.map(s => <option key={s.id} value={s.id}>{s.trackingNumber} – {s.senderName} → {s.receiverCity}</option>)}
            </select>
            {errors.shipmentId && <p className="text-xs text-red-500 mt-1">{errors.shipmentId}</p>}
          </div>

          {selectedShipment && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              Delivery Charge: <strong>{formatCurrency(selectedShipment.deliveryCharge)}</strong> | Type: {selectedShipment.deliveryType}
            </div>
          )}

          <div>
            <label className="label">Amount (₹) <span className="text-red-500">*</span></label>
            <input name="amount" type="text" inputMode="decimal" value={form.amount} onChange={handleChange}
              autoComplete="off"
              className={`input-field ${errors.amount ? 'border-red-400' : ''}`} placeholder="0.00" />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Method <span className="text-red-500">*</span></label>
              <select name="method" value={form.method} onChange={handleChange} className="input-field">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input-field">
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Transaction Reference</label>
            <input name="transactionRef" value={form.transactionRef} onChange={handleChange} className="input-field" placeholder="auto-generated if empty" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/payments')}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSave size={16} /> {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
