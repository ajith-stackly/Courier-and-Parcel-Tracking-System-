import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTransfers, getBranches, getShipment, patchShipment, patchTransfer, createTrackingEntry, createActivity } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { formatDateTime, getValidNextStatuses, paginate } from '../../utils/helpers';
import { createShipmentNotifications } from '../../utils/notifications';
import { FiPlus, FiSearch, FiRepeat } from 'react-icons/fi';

const TransferList = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [receivingId, setReceivingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, bRes] = await Promise.all([getTransfers(), getBranches()]);
        setTransfers(tRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setBranches(bRes.data);
      } catch { toast.error('Failed to load transfers'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getBranchName = (id) => branches.find(b => b.id === id)?.name || `Branch ${id}`;

  const handleReceive = async (transfer) => {
    if (user.role === 'branch_staff' && String(user.branchId) !== String(transfer.toBranchId)) {
      toast.error('Only staff at the destination branch can receive this transfer');
      return;
    }

    setReceivingId(transfer.id);
    try {
      const shipment = (await getShipment(transfer.shipmentId)).data;
      if (!getValidNextStatuses(shipment).includes('Arrived at Destination')) {
        toast.error(`Cannot receive this transfer while shipment is "${shipment.status}"`);
        return;
      }

      const now = new Date().toISOString();
      const destinationName = getBranchName(transfer.toBranchId);
      await patchShipment(shipment.id, {
        status: 'Arrived at Destination',
        currentBranchId: transfer.toBranchId,
      });
      await patchTransfer(transfer.id, { status: 'Completed', receivedAt: now });
      await createTrackingEntry({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: 'Arrived at Destination',
        location: destinationName,
        branchId: transfer.toBranchId,
        remarks: `Received at ${destinationName}`,
        timestamp: now,
        updatedBy: user.name,
      });
      await createActivity({
        type: 'transfer_received',
        message: `${shipment.trackingNumber} received at ${destinationName}`,
        userId: user.id,
        entityType: 'shipment',
        entityId: shipment.id,
        timestamp: now,
      });
      await createShipmentNotifications({
        ...shipment,
        status: 'Arrived at Destination',
        currentBranchId: transfer.toBranchId,
      }, `Shipment ${shipment.trackingNumber} received at ${destinationName}`, user);
      setTransfers(prev => prev.map(item => item.id === transfer.id
        ? { ...item, status: 'Completed', receivedAt: now }
        : item));
      toast.success(`Transfer received at ${destinationName}`);
    } catch {
      toast.error('Failed to receive transfer');
    } finally {
      setReceivingId(null);
    }
  };

  const statusColors = {
    'Completed': 'bg-green-100 text-green-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    'Pending': 'bg-blue-100 text-blue-800',
  };

  const filtered = transfers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || (t.trackingNumber || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { data: paginated, totalPages, currentPage } = paginate(filtered, page);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="page-header mb-0">Branch Transfers</h1>
        <Link to="/transfers/new" className="btn-primary flex items-center gap-2 w-fit"><FiPlus size={18} /> New Transfer</Link>
      </div>

      <div className="card mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input-field pl-10" placeholder="Search tracking number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-field sm:w-48" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="In Transit">In Transit</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      <div className="table-container">
        {paginated.length === 0 ? (
          <EmptyState title="No transfers found" icon={<FiRepeat size={48} className="mb-3 text-gray-300" />} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tracking #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">From Branch</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">To Branch</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Remarks</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/shipments?q=${t.trackingNumber}`} className="text-primary-600 font-medium hover:underline font-mono">{t.trackingNumber}</Link>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-700">{getBranchName(t.fromBranchId)}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-700">{getBranchName(t.toBranchId)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[t.status] || 'bg-gray-100 text-gray-700'}`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-500 text-xs">{t.remarks || '-'}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-xs">{formatDateTime(t.transferDate || t.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      {t.status === 'In Transit' && (
                        <button
                          onClick={() => handleReceive(t)}
                          disabled={receivingId === t.id}
                          className="btn-primary text-xs"
                        >
                          {receivingId === t.id ? 'Receiving...' : 'Receive at Branch'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default TransferList;
