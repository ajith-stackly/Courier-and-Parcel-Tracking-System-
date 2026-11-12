import { useState, useEffect } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipment, patchShipment, createTrackingEntry, updateAgent, getPaymentByShipment, updatePayment, createActivity } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { canAccessShipment, formatDate, formatCurrency, getValidNextStatuses } from '../../utils/helpers';
import { createShipmentNotifications } from '../../utils/notifications';
import { FiArrowLeft, FiCheck, FiAlertTriangle, FiTruck, FiUser, FiMapPin } from 'react-icons/fi';

const getLocalDateTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const DeliveryConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [form, setForm] = useState({ receiverName: '', remarks: '', deliveryDate: getLocalDateTime() });

  useEffect(() => {
    setLoading(true);
    setShipment(null);
    setUnauthorized(false);
    getShipment(id)
      .then(res => {
        if (!canAccessShipment(user, res.data)) {
          setUnauthorized(true);
          return;
        }
        setShipment(res.data);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleAction = async (type) => {
    if (type === 'delivered' && !form.receiverName.trim()) { toast.error('Receiver name is required'); return; }
    if (type === 'failed' && !form.remarks) { toast.error('Please provide failure reason'); return; }
    const newStatus = type === 'delivered' ? 'Delivered'
      : type === 'failed' ? 'Delivery Failed'
        : type === 'accepted' ? 'Accepted'
          : type === 'out' ? 'Out for Delivery'
            : null;
    if (!newStatus || !getValidNextStatuses(shipment).includes(newStatus)) {
      toast.error(`Cannot change status from "${shipment.status}" to "${newStatus || type}"`);
      return;
    }

    const deliveryDate = new Date(form.deliveryDate);
    if (type === 'delivered' && Number.isNaN(deliveryDate.getTime())) {
      toast.error('Enter a valid delivery date and time');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const eventTimestamp = type === 'delivered' ? deliveryDate.toISOString() : now;

      await patchShipment(id, {
        status: newStatus,
        ...(type === 'delivered' ? { actualDeliveryDate: eventTimestamp } : {}),
      });

      await createTrackingEntry({
        shipmentId: parseInt(id),
        trackingNumber: shipment.trackingNumber,
        status: newStatus,
        location: type === 'delivered' ? `${shipment.receiverAddress}, ${shipment.receiverCity}` : shipment.receiverCity,
        branchId: shipment.currentBranchId,
        remarks: type === 'delivered' ? form.remarks || `Delivered to ${form.receiverName}` : form.remarks,
        timestamp: eventTimestamp,
        updatedBy: user.name,
        ...(type === 'delivered' ? { receiverName: form.receiverName } : {}),
      });

      if (['delivered', 'failed'].includes(type) && shipment.agentId != null) {
        await updateAgent(shipment.agentId, { availability: 'available' });
      }

      let paymentChanged = false;
      if (type === 'delivered') {
        const pRes = await getPaymentByShipment(id);
        if (pRes.data[0] && pRes.data[0].status === 'Pending') {
          await updatePayment(pRes.data[0].id, { ...pRes.data[0], status: 'Paid' });
          paymentChanged = true;
        }
      }

      await createActivity({
        type: 'delivery_update', message: `${shipment.trackingNumber} → ${newStatus}`,
        userId: user.id, entityType: 'shipment', entityId: parseInt(id), timestamp: eventTimestamp,
      });

      await createShipmentNotifications(shipment, `Shipment ${shipment.trackingNumber} ${newStatus.toLowerCase()}`, user);
      if (paymentChanged) await createShipmentNotifications(shipment, `Payment paid for shipment ${shipment.trackingNumber}`, user);
      toast.success(`Status updated: ${newStatus}`);
      navigate('/deliveries');
    } catch { toast.error('Failed to update status'); }
    finally { setSaving(false); }
  };

  if (unauthorized) return <Navigate to="/unauthorized" replace />;
  if (loading) return <LoadingSpinner />;
  if (!shipment) return <div className="card text-center text-gray-500">Shipment not found</div>;

  const isAgentAssigned = shipment.status === 'Agent Assigned';
  const isAccepted = shipment.status === 'Accepted';
  const isOutForDelivery = shipment.status === 'Out for Delivery';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/deliveries')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><FiArrowLeft size={20} /></button>
        <div>
          <h1 className="page-header mb-0">Delivery Update</h1>
          <p className="text-sm font-mono text-gray-500">{shipment.trackingNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment Info */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Shipment Details</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={shipment.status} />
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <FiUser className="mt-0.5 text-gray-400 flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Receiver</p>
                <p className="font-medium text-gray-800">{shipment.receiverName}</p>
                <p className="text-sm text-gray-600">{shipment.receiverPhone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <FiMapPin className="mt-0.5 text-gray-400 flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
                <p className="text-sm text-gray-800">{shipment.receiverAddress}</p>
                <p className="text-sm text-gray-600">{shipment.receiverCity}, {shipment.receiverState} - {shipment.receiverPincode}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Parcel Type</p>
                <p className="font-medium text-gray-700">{shipment.parcelType}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Weight</p>
                <p className="font-medium text-gray-700">{shipment.weight} kg</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Expected</p>
                <p className="font-medium text-gray-700">{formatDate(shipment.expectedDeliveryDate)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Charge</p>
                <p className="font-medium text-gray-700">{formatCurrency(shipment.deliveryCharge)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Update Delivery Status</h2>

          {isAgentAssigned && user.role === 'delivery_agent' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-1">Shipment assigned to you</p>
                <p className="text-xs text-blue-600">Accept the shipment before marking it out for delivery.</p>
              </div>
              <button onClick={() => handleAction('accepted')} disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                <FiCheck size={18} /> {saving ? 'Updating...' : 'Accept Shipment'}
              </button>
            </div>
          )}

          {isAccepted && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-1">Shipment accepted</p>
                <p className="text-xs text-blue-600">Mark this shipment out for delivery once you have picked it up.</p>
              </div>
              <button onClick={() => handleAction('out')} disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                <FiTruck size={18} /> {saving ? 'Updating...' : 'Mark Out for Delivery'}
              </button>
            </div>
          )}

          {isOutForDelivery && (
            <div className="space-y-5">
              {/* Delivered form */}
              <div className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${action === 'delivered' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setAction('delivered')}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${action === 'delivered' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                    {action === 'delivered' && <FiCheck size={12} className="text-white" />}
                  </div>
                  <span className="font-semibold text-green-800">✅ Successfully Delivered</span>
                </div>
                {action === 'delivered' && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="label text-sm">Receiver Name <span className="text-red-500">*</span></label>
                      <input className="input-field" value={form.receiverName} onChange={e => setForm(p => ({ ...p, receiverName: e.target.value }))} placeholder="Name of person who received" />
                    </div>
                    <div>
                      <label className="label text-sm">Delivery Time <span className="text-red-500">*</span></label>
                      <input type="datetime-local" required className="input-field" value={form.deliveryDate} onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-sm">Remarks</label>
                      <textarea className="input-field" rows={2} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} placeholder="Delivery notes..." />
                    </div>
                    <button onClick={() => handleAction('delivered')} disabled={saving}
                      className="w-full btn-success flex items-center justify-center gap-2 py-2.5">
                      <FiCheck size={16} /> {saving ? 'Saving...' : 'Confirm Delivery'}
                    </button>
                  </div>
                )}
              </div>

              {/* Failed form */}
              <div className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${action === 'failed' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setAction('failed')}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${action === 'failed' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                    {action === 'failed' && <FiCheck size={12} className="text-white" />}
                  </div>
                  <span className="font-semibold text-red-800">❌ Delivery Failed</span>
                </div>
                {action === 'failed' && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="label text-sm">Failure Reason <span className="text-red-500">*</span></label>
                      <select className="input-field" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}>
                        <option value="">Select reason</option>
                        <option value="Customer not available">Customer not available</option>
                        <option value="Wrong address">Wrong address</option>
                        <option value="Refused delivery">Refused delivery</option>
                        <option value="Address not found">Address not found</option>
                        <option value="Delivery attempted - no one home">Delivery attempted - no one home</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <button onClick={() => handleAction('failed')} disabled={saving}
                      className="w-full btn-danger flex items-center justify-center gap-2 py-2.5">
                      <FiAlertTriangle size={16} /> {saving ? 'Saving...' : 'Report Failed Delivery'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isAccepted && !isAgentAssigned && !isOutForDelivery && (
            <div className="text-center py-8">
              <StatusBadge status={shipment.status} size="lg" />
              <p className="text-gray-500 text-sm mt-3">No action available for this status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryConfirmation;
