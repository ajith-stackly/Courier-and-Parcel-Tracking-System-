import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipments, getBranches, createTransfer, patchShipment, createTrackingEntry, createActivity } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getValidNextStatuses } from '../../utils/helpers';
import { createShipmentNotifications } from '../../utils/notifications';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

const TransferForm = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ shipmentId: '', toBranchId: '', remarks: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, bRes] = await Promise.all([getShipments(), getBranches()]);
        setShipments(sRes.data.filter(s => !s.returnInProgress && getValidNextStatuses(s).includes('In Transit')));
        setBranches(bRes.data.filter(b => b.status === 'active'));
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.shipmentId) errs.shipmentId = 'Select a shipment';
    if (!form.toBranchId) errs.toBranchId = 'Select destination branch';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const selectedShipment = shipments.find(s => s.id === parseInt(form.shipmentId));
    if (!selectedShipment) { toast.error('Invalid shipment'); return; }
    if (selectedShipment.returnInProgress || !getValidNextStatuses(selectedShipment).includes('In Transit')) {
      toast.error(`Cannot transfer a shipment while it is "${selectedShipment.status}"`);
      return;
    }
    if (selectedShipment.currentBranchId === parseInt(form.toBranchId)) {
      toast.error('Origin and destination branch cannot be the same');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const fromBranch = branches.find(b => b.id === selectedShipment.currentBranchId);
      const toBranch = branches.find(b => b.id === parseInt(form.toBranchId));

      await createTransfer({
        shipmentId: selectedShipment.id,
        trackingNumber: selectedShipment.trackingNumber,
        fromBranchId: selectedShipment.currentBranchId,
        toBranchId: parseInt(form.toBranchId),
        transferDate: now,
        status: 'In Transit',
        remarks: form.remarks || `Transfer from ${fromBranch?.name} to ${toBranch?.name}`,
        createdAt: now,
      });

      await patchShipment(selectedShipment.id, { status: 'In Transit' });

      await createTrackingEntry({
        shipmentId: selectedShipment.id,
        trackingNumber: selectedShipment.trackingNumber,
        status: 'In Transit',
        location: `${fromBranch?.name} → ${toBranch?.name}`,
        branchId: selectedShipment.currentBranchId,
        remarks: form.remarks || `Transferred to ${toBranch?.name}`,
        timestamp: now,
        updatedBy: user.name,
      });

      await createActivity({
        type: 'transfer_created',
        message: `${selectedShipment.trackingNumber} transferred to ${toBranch?.name}`,
        userId: user.id, entityType: 'shipment', entityId: selectedShipment.id, timestamp: now,
      });
      await createShipmentNotifications({ ...selectedShipment, status: 'In Transit' }, `Shipment ${selectedShipment.trackingNumber} is in transit to ${toBranch?.name}`, user);

      toast.success(`Transfer created: ${selectedShipment.trackingNumber} → ${toBranch?.name}`);
      navigate('/transfers');
    } catch { toast.error('Failed to create transfer'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/transfers')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><FiArrowLeft size={20} /></button>
        <h1 className="page-header mb-0">New Branch Transfer</h1>
      </div>

      <div className="card max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Select Shipment <span className="text-red-500">*</span></label>
            <select name="shipmentId" value={form.shipmentId} onChange={handleChange}
              className={`input-field ${errors.shipmentId ? 'border-red-400' : ''}`}>
              <option value="">Select a shipment...</option>
              {shipments.map(s => (
                <option key={s.id} value={s.id}>
                  {s.trackingNumber} – {s.senderName} → {s.receiverCity} ({s.status})
                </option>
              ))}
            </select>
            {errors.shipmentId && <p className="text-xs text-red-500 mt-1">{errors.shipmentId}</p>}
          </div>

          {form.shipmentId && (() => {
            const sel = shipments.find(s => s.id === parseInt(form.shipmentId));
            const fromBranch = branches.find(b => b.id === sel?.currentBranchId);
            return sel ? (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <span className="text-gray-500">Current Branch: </span>
                <span className="font-medium text-blue-700">{fromBranch?.name || `Branch ${sel.currentBranchId}`}</span>
              </div>
            ) : null;
          })()}

          <div>
            <label className="label">Destination Branch <span className="text-red-500">*</span></label>
            <select name="toBranchId" value={form.toBranchId} onChange={handleChange}
              className={`input-field ${errors.toBranchId ? 'border-red-400' : ''}`}>
              <option value="">Select destination branch...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code}) – {b.city}</option>)}
            </select>
            {errors.toBranchId && <p className="text-xs text-red-500 mt-1">{errors.toBranchId}</p>}
          </div>

          <div>
            <label className="label">Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={2}
              className="input-field" placeholder="Optional transfer remarks..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/transfers')}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSave size={16} /> {saving ? 'Creating...' : 'Create Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferForm;
