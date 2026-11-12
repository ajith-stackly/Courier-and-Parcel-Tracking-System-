import { useState, useEffect } from 'react';
import { Navigate, useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getShipment, getTrackingByShipment, getPaymentByShipment,
  getBranches, getAvailableAgents, getParcels,
  patchShipment, createTrackingEntry, updateAgent, updatePayment, createActivity,
} from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { CANCELLABLE_STATUSES } from '../../utils/constants';
import { canAccessShipment, formatDate, formatDateTime, formatCurrency, getValidNextStatuses } from '../../utils/helpers';
import { createShipmentNotifications } from '../../utils/notifications';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import {
  FiArrowLeft, FiEdit2, FiX, FiTruck, FiUser, FiMapPin,
  FiPackage, FiClock, FiCheck, FiAlertTriangle, FiRotateCcw,
} from 'react-icons/fi';

const getLocalDateTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [shipment, setShipment] = useState(null);
  const [history, setHistory] = useState([]);
  const [payment, setPayment] = useState(null);
  const [branches, setBranches] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [statusModal, setStatusModal] = useState({ open: false });
  const [agentModal, setAgentModal] = useState({ open: false });
  const [cancelModal, setCancelModal] = useState({ open: false });
  const [confirmDelivery, setConfirmDelivery] = useState({ open: false, type: '' });
  const [formData, setFormData] = useState({ status: '', remarks: '', receiverName: '', deliveryDate: getLocalDateTime(), selectedAgent: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const sRes = await getShipment(id);
      if (!canAccessShipment(user, sRes.data)) {
        setUnauthorized(true);
        return;
      }
      const [hRes, bRes, pRes, parcelRes] = await Promise.all([
        getTrackingByShipment(id), getBranches(), getPaymentByShipment(id), getParcels(),
      ]);
      setShipment(sRes.data);
      setHistory(hRes.data);
      setBranches(bRes.data);
      setParcels(parcelRes.data);
      setPayment(pRes.data[0] || null);
    } catch { toast.error('Failed to load shipment details'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    setShipment(null);
    setUnauthorized(false);
    fetchData();
  }, [id, user]);

  useEffect(() => {
    if (shipment?.currentBranchId) {
      getAvailableAgents(shipment.currentBranchId)
        .then(res => setAvailableAgents(res.data)).catch(() => {});
    }
  }, [shipment]);

  const getBranchName = (bid) => branches.find(b => b.id === bid)?.name || `Branch ${bid}`;
  const getParcelDescription = (parcelId) => parcels.find(parcel => String(parcel.id) === String(parcelId))?.description;

  const updateStatus = async (newStatus, remarks = '', extra = {}) => {
    if (!getValidNextStatuses(shipment).includes(newStatus)) {
      toast.error(`Cannot change status from "${shipment.status}" to "${newStatus}"`);
      return false;
    }
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const statusUpdate = {
        status: newStatus,
        ...extra,
        ...(newStatus === 'Return Initiated' ? { returnInProgress: true } : {}),
        ...(newStatus === 'Returned to Sender' ? { returnInProgress: false } : {}),
      };
      await patchShipment(id, statusUpdate);
      await createTrackingEntry({
        shipmentId: parseInt(id), trackingNumber: shipment.trackingNumber,
        status: newStatus,
        location: getBranchName(shipment.currentBranchId),
        branchId: shipment.currentBranchId,
        remarks: remarks || `Status updated to ${newStatus}`,
        timestamp: now, updatedBy: user.name,
      });
      await createActivity({ type: 'status_update', message: `${shipment.trackingNumber} → ${newStatus}`, userId: user.id, entityType: 'shipment', entityId: parseInt(id), timestamp: now });
      await createShipmentNotifications({ ...shipment, ...statusUpdate }, `Shipment ${shipment.trackingNumber} status changed to ${newStatus}`, user);
      toast.success(`Status updated to "${newStatus}"`);
      await fetchData();
      return true;
    } catch { toast.error('Failed to update status'); }
    finally { setActionLoading(false); }
    return false;
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const updated = await updateStatus('Cancelled', 'Cancelled by ' + user.name);
      if (!updated) return;
      if (payment && payment.status === 'Paid') {
        await updatePayment(payment.id, { ...payment, status: 'Refunded' });
        await createShipmentNotifications(shipment, `Payment refunded for shipment ${shipment.trackingNumber}`, user);
      }
      setCancelModal({ open: false });
      toast.success('Shipment cancelled and refund initiated');
    } catch { toast.error('Cancellation failed'); }
    finally { setActionLoading(false); }
  };

  const handleAssignAgent = async () => {
    if (!formData.selectedAgent) { toast.error('Select an agent'); return; }
    if (!getValidNextStatuses(shipment).includes('Agent Assigned')) {
      toast.error(`Cannot assign an agent while shipment is "${shipment.status}"`);
      return;
    }
    setActionLoading(true);
    try {
      const agent = availableAgents.find(a => String(a.id) === String(formData.selectedAgent));
      if (!agent) {
        toast.error('The selected agent is no longer available');
        return;
      }
      const agentId = parseInt(formData.selectedAgent);
      await patchShipment(id, { agentId, status: 'Agent Assigned' });
      await updateAgent(agentId, { availability: 'on_delivery' });
      const now = new Date().toISOString();
      await createTrackingEntry({
        shipmentId: parseInt(id), trackingNumber: shipment.trackingNumber,
        status: 'Agent Assigned',
        location: getBranchName(shipment.currentBranchId),
        branchId: shipment.currentBranchId,
        remarks: `Assigned to ${agent.name}`,
        timestamp: now, updatedBy: user.name,
      });
      await createActivity({ type: 'agent_assigned', message: `${shipment.trackingNumber} assigned to ${agent.name}`, userId: user.id, entityType: 'shipment', entityId: parseInt(id), timestamp: now });
      await createShipmentNotifications({ ...shipment, agentId }, `Shipment ${shipment.trackingNumber} assigned to ${agent.name}`, user);
      toast.success(`Assigned to ${agent.name}`);
      setAgentModal({ open: false });
      await fetchData();
    } catch { toast.error('Failed to assign agent'); }
    finally { setActionLoading(false); }
  };

  const handleDeliveryConfirm = async () => {
    if (confirmDelivery.type === 'delivered' && !formData.receiverName.trim()) {
      toast.error('Receiver name is required');
      return;
    }
    const newStatus = confirmDelivery.type === 'delivered' ? 'Delivered' : 'Delivery Failed';
    if (!getValidNextStatuses(shipment).includes(newStatus)) {
      toast.error(`Cannot change status from "${shipment.status}" to "${newStatus}"`);
      return;
    }
    const deliveryDate = new Date(formData.deliveryDate);
    if (confirmDelivery.type === 'delivered' && Number.isNaN(deliveryDate.getTime())) {
      toast.error('Enter a valid delivery date and time');
      return;
    }
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const eventTimestamp = confirmDelivery.type === 'delivered' ? deliveryDate.toISOString() : now;
      let paymentChanged = false;
      if (confirmDelivery.type === 'delivered') {
        await patchShipment(id, { status: 'Delivered', actualDeliveryDate: eventTimestamp });
        await createTrackingEntry({
          shipmentId: parseInt(id), trackingNumber: shipment.trackingNumber,
          status: 'Delivered', location: shipment.receiverCity,
          branchId: shipment.currentBranchId,
          remarks: formData.remarks || 'Delivered successfully',
          timestamp: eventTimestamp, updatedBy: user.name,
          receiverName: formData.receiverName,
        });
      } else {
        await patchShipment(id, { status: 'Delivery Failed' });
        await createTrackingEntry({
          shipmentId: parseInt(id), trackingNumber: shipment.trackingNumber,
          status: 'Delivery Failed', location: shipment.receiverCity,
          branchId: shipment.currentBranchId,
          remarks: formData.remarks || 'Delivery attempt failed',
          timestamp: now, updatedBy: user.name,
        });
      }
      if (shipment.agentId != null) await updateAgent(shipment.agentId, { availability: 'available' });
      if (confirmDelivery.type === 'delivered' && payment && payment.status !== 'Paid') {
        await updatePayment(payment.id, { ...payment, status: 'Paid' });
        paymentChanged = true;
      }
      await createActivity({ type: 'delivery_update', message: `${shipment.trackingNumber} → ${newStatus}`, userId: user.id, entityType: 'shipment', entityId: parseInt(id), timestamp: eventTimestamp });
      await createShipmentNotifications(shipment, `Shipment ${shipment.trackingNumber} ${newStatus.toLowerCase()}`, user);
      if (paymentChanged) await createShipmentNotifications(shipment, `Payment paid for shipment ${shipment.trackingNumber}`, user);
      setConfirmDelivery({ open: false, type: '' });
      setFormData(p => ({ ...p, receiverName: '', remarks: '', deliveryDate: getLocalDateTime() }));
      await fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(false); }
  };

  const handleReturn = async () => {
    if (!getValidNextStatuses(shipment).includes('Return Initiated')) {
      toast.error(`Cannot initiate a return while shipment is "${shipment.status}"`);
      return;
    }
    try {
      if (shipment.agentId != null) await updateAgent(shipment.agentId, { availability: 'available' });
      const updated = await updateStatus('Return Initiated', 'Return to sender initiated after failed delivery');
      if (!updated) return;
      if (payment && payment.status === 'Paid') {
        await updatePayment(payment.id, { ...payment, status: 'Refunded' });
        await createShipmentNotifications(shipment, `Payment refunded for shipment ${shipment.trackingNumber}`, user);
      }
    } catch {
      toast.error('Failed to initiate the return or refund');
    }
  };

  if (unauthorized) return <Navigate to="/unauthorized" replace />;
  if (loading) return <LoadingSpinner />;
  if (!shipment) return <div className="card text-center text-gray-500">Shipment not found</div>;

  const canCancel = CANCELLABLE_STATUSES.includes(shipment.status) && ['admin', 'branch_staff', 'customer'].includes(user.role);
  const canAssignAgent = shipment.status === 'Arrived at Destination' && ['admin', 'branch_staff'].includes(user.role);
  const canUpdateStatus = ['admin', 'branch_staff'].includes(user.role);
  const canAccept = user.role === 'delivery_agent' && shipment.status === 'Agent Assigned';
  const canDelivery = ['Accepted', 'Out for Delivery'].includes(shipment.status) && ['delivery_agent', 'admin', 'branch_staff'].includes(user.role);
  const canReturn = shipment.status === 'Delivery Failed' && ['admin', 'branch_staff'].includes(user.role);

  const InfoItem = ({ label, value }) => (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
    </div>
  );

  const isReturnFlow = Boolean(shipment.returnInProgress) || ['Return Initiated', 'Returned to Sender'].includes(shipment.status);
  const statusSteps = isReturnFlow
    ? ['Delivery Failed', 'Return Initiated', 'In Transit', 'Returned to Sender']
    : ['Shipment Created','Branch Received','Processing','In Transit','Arrived at Destination','Agent Assigned','Accepted','Out for Delivery','Delivered'];
  const currentStepIdx = statusSteps.indexOf(shipment.status);
  const isTerminal = ['Delivered','Cancelled','Returned to Sender'].includes(shipment.status);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/shipments')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><FiArrowLeft size={20} /></button>
          <div>
            <h1 className="page-header mb-0">Shipment Detail</h1>
            <p className="text-sm text-gray-500 font-mono">{shipment.trackingNumber}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={shipment.status} size="lg" />
          {canUpdateStatus && !isTerminal && (
            <button onClick={() => setStatusModal({ open: true })} className="btn-secondary text-sm flex items-center gap-1"><FiClock size={15} /> Update Status</button>
          )}
          {canAssignAgent && (
            <button onClick={() => setAgentModal({ open: true })} className="btn-primary text-sm flex items-center gap-1"><FiTruck size={15} /> Assign Agent</button>
          )}
          {canAccept && (
            <button onClick={() => updateStatus('Accepted', `Accepted by ${user.name}`)} disabled={actionLoading} className="btn-primary text-sm flex items-center gap-1"><FiCheck size={15} /> Accept Shipment</button>
          )}
          {canDelivery && (
            <>
              {shipment.status === 'Accepted' && (
                <button onClick={() => updateStatus('Out for Delivery', 'Agent picked up parcel')} disabled={actionLoading} className="btn-primary text-sm flex items-center gap-1"><FiTruck size={15} /> Out for Delivery</button>
              )}
              {shipment.status === 'Out for Delivery' && (
                <>
                  <button onClick={() => setConfirmDelivery({ open: true, type: 'delivered' })} className="btn-success text-sm flex items-center gap-1"><FiCheck size={15} /> Mark Delivered</button>
                  <button onClick={() => setConfirmDelivery({ open: true, type: 'failed' })} className="btn-danger text-sm flex items-center gap-1"><FiAlertTriangle size={15} /> Delivery Failed</button>
                </>
              )}
            </>
          )}
          {canReturn && (
            <button onClick={handleReturn} disabled={actionLoading} className="btn-warning text-sm flex items-center gap-1"><FiRotateCcw size={15} /> Return to Sender</button>
          )}
          {canCancel && (
            <button onClick={() => setCancelModal({ open: true })} className="btn-danger text-sm flex items-center gap-1"><FiX size={15} /> Cancel</button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!['Cancelled','Returned to Sender'].includes(shipment.status) && (
        <div className="card mb-6 overflow-x-auto">
          <div className="flex items-center min-w-max">
            {statusSteps.map((step, idx) => {
              const isCompleted = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : isCurrent ? 'bg-primary-600 border-primary-600 text-white animate-pulse' : 'bg-white border-gray-300 text-gray-400'}`}>
                      {isCompleted ? <FiCheck size={14} /> : idx + 1}
                    </div>
                    <p className={`text-xs mt-1 max-w-[70px] text-center leading-tight ${isCurrent ? 'text-primary-700 font-semibold' : isCompleted ? 'text-green-700' : 'text-gray-400'}`}>{step}</p>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div className={`h-1 w-10 sm:w-16 mx-1 rounded ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Sender & Receiver */}
          <div className="card grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FiUser size={16}/> Sender</h3>
              <div className="space-y-2">
                <InfoItem label="Name" value={shipment.senderName} />
                <InfoItem label="Phone" value={shipment.senderPhone} />
                <InfoItem label="Address" value={`${shipment.senderAddress}, ${shipment.senderCity}, ${shipment.senderState} - ${shipment.senderPincode}`} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FiMapPin size={16}/> Receiver</h3>
              <div className="space-y-2">
                <InfoItem label="Name" value={shipment.receiverName} />
                <InfoItem label="Phone" value={shipment.receiverPhone} />
                <InfoItem label="Address" value={`${shipment.receiverAddress}, ${shipment.receiverCity}, ${shipment.receiverState} - ${shipment.receiverPincode}`} />
              </div>
            </div>
          </div>

          {/* Parcel & Delivery */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FiPackage size={16}/> Parcel & Delivery Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoItem label="Parcel Type" value={getParcelDescription(shipment.parcelId) ? `${shipment.parcelType} — ${getParcelDescription(shipment.parcelId)}` : shipment.parcelType} />
              <InfoItem label="Weight" value={`${shipment.weight} kg`} />
              <InfoItem label="Dimensions (cm)" value={`${shipment.length || '-'} × ${shipment.width || '-'} × ${shipment.height || '-'}`} />
              <InfoItem label="Delivery Type" value={shipment.deliveryType} />
              <InfoItem label="Origin Branch" value={getBranchName(shipment.originBranchId)} />
              <InfoItem label="Destination Branch" value={getBranchName(shipment.destinationBranchId)} />
              <InfoItem label="Expected Delivery" value={formatDate(shipment.expectedDeliveryDate)} />
              <InfoItem label="Actual Delivery" value={formatDate(shipment.actualDeliveryDate)} />
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Tracking Timeline</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No tracking events yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {[...history].reverse().map((h, idx) => {
                    const isFirst = idx === 0;
                    const statusColors = {
                      'Delivered': 'bg-green-500', 'Delivery Failed': 'bg-red-500',
                      'Cancelled': 'bg-gray-500', 'Returned to Sender': 'bg-rose-500',
                    };
                    const dotColor = statusColors[h.status] || (isFirst ? 'bg-primary-600' : 'bg-gray-400');
                    return (
                      <div key={h.id} className="relative flex gap-4">
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${dotColor}`}>
                          <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                        </div>
                        <div className={`flex-1 pb-2 ${isFirst ? '' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <StatusBadge status={h.status} />
                              <p className="text-xs text-gray-500 mt-1">{h.location}</p>
                              {h.remarks && <p className="text-sm text-gray-600 mt-1">{h.remarks}</p>}
                              {h.receiverName && <p className="text-xs text-green-700 mt-1">Received by: {h.receiverName}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-400">{formatDateTime(h.timestamp)}</p>
                              <p className="text-xs text-gray-400">{h.updatedBy}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: payment info */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3">Payment Info</h3>
            {payment ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Method</span>
                  <span className="text-gray-700">{payment.method}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${payment.status === 'Paid' ? 'text-green-600' : payment.status === 'Pending' ? 'text-orange-600' : payment.status === 'Refunded' ? 'text-blue-600' : 'text-red-600'}`}>{payment.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ref</span>
                  <span className="text-gray-500 text-xs font-mono">{payment.transactionRef}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No payment record</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3">Shipment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-700">{formatDate(shipment.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery Type</span><span className="font-medium text-gray-700">{shipment.deliveryType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Weight</span><span className="text-gray-700">{shipment.weight} kg</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-100"><span className="font-medium text-gray-700">Delivery Charge</span><span className="font-bold text-gray-800">{formatCurrency(shipment.deliveryCharge)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal isOpen={statusModal.open} onClose={() => setStatusModal({ open: false })} title="Update Shipment Status">
        <div className="space-y-4">
          <div>
            <label className="label">New Status</label>
            <select className="input-field" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
              <option value="">Select status</option>
              {getValidNextStatuses(shipment)
                .filter(s => !['Cancelled', 'Delivered', 'Delivery Failed'].includes(s))
                .map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input-field" rows={2} value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks" />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setStatusModal({ open: false })}>Cancel</button>
            <button className="btn-primary" disabled={!formData.status || actionLoading}
              onClick={async () => { const updated = await updateStatus(formData.status, formData.remarks); if (updated) setStatusModal({ open: false }); }}>
              Update
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Agent Modal */}
      <Modal isOpen={agentModal.open} onClose={() => setAgentModal({ open: false })} title="Assign Delivery Agent">
        <div className="space-y-4">
          {availableAgents.length === 0 ? (
            <p className="text-gray-500">No available agents at this branch.</p>
          ) : (
            <div>
              <label className="label">Select Agent</label>
              <select className="input-field" value={formData.selectedAgent} onChange={e => setFormData(p => ({ ...p, selectedAgent: e.target.value }))}>
                <option value="">Select agent</option>
                {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name} – {a.vehicleType} ({a.vehicleNumber})</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setAgentModal({ open: false })}>Cancel</button>
            <button className="btn-primary" disabled={!formData.selectedAgent || actionLoading} onClick={handleAssignAgent}>Assign</button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false })} title="Cancel Shipment">
        <p className="text-gray-600 mb-6">Are you sure you want to cancel this shipment? A refund will be initiated if already paid.</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setCancelModal({ open: false })}>Keep Shipment</button>
          <button className="btn-danger" disabled={actionLoading} onClick={handleCancel}>{actionLoading ? 'Cancelling...' : 'Cancel Shipment'}</button>
        </div>
      </Modal>

      {/* Delivery Confirm Modal */}
      <Modal isOpen={confirmDelivery.open} onClose={() => setConfirmDelivery({ open: false, type: '' })}
        title={confirmDelivery.type === 'delivered' ? 'Confirm Delivery' : 'Report Failed Delivery'}>
        <div className="space-y-4">
          {confirmDelivery.type === 'delivered' && (
            <div className="space-y-4">
              <div>
                <label className="label">Receiver Name <span className="text-red-500">*</span></label>
                <input required className="input-field" value={formData.receiverName} onChange={e => setFormData(p => ({ ...p, receiverName: e.target.value }))} placeholder="Name of person who received" />
              </div>
              <div>
                <label className="label">Delivery Date and Time <span className="text-red-500">*</span></label>
                <input type="datetime-local" required className="input-field" value={formData.deliveryDate} onChange={e => setFormData(p => ({ ...p, deliveryDate: e.target.value }))} />
              </div>
            </div>
          )}
          <div>
            <label className="label">Remarks</label>
            <textarea className="input-field" rows={2} value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
              placeholder={confirmDelivery.type === 'delivered' ? 'Delivery notes...' : 'Reason for failure...'} />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setConfirmDelivery({ open: false, type: '' })}>Cancel</button>
            <button disabled={actionLoading} onClick={handleDeliveryConfirm}
              className={confirmDelivery.type === 'delivered' ? 'btn-success' : 'btn-danger'}>
              {confirmDelivery.type === 'delivered' ? 'Confirm Delivered' : 'Confirm Failed'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShipmentDetail;
