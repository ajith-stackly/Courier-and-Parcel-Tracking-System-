import { useState, useEffect } from 'react';
import { getShipments, getBranches, getCustomers } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/helpers';
import { SHIPMENT_STATUSES, DELIVERY_TYPES } from '../../utils/constants';
import { FiPrinter, FiDownload, FiBarChart2 } from 'react-icons/fi';

const ShipmentReport = () => {
  const toast = useToast();
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', deliveryType: '', branchId: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, cRes, bRes] = await Promise.all([getShipments(), getCustomers(), getBranches()]);
        setShipments(sRes.data);
        setCustomers(cRes.data);
        setBranches(bRes.data);
      } catch { toast.error('Failed to load report data'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getCustomerName = (cid) => customers.find(c => c.id === cid)?.name || '-';
  const getBranchName = (bid) => branches.find(b => b.id === bid)?.name || `Branch ${bid}`;

  const filtered = shipments.filter(s => {
    const matchStatus = !filters.status || s.status === filters.status;
    const matchType = !filters.deliveryType || s.deliveryType === filters.deliveryType;
    const matchBranch = !filters.branchId || String(s.originBranchId) === String(filters.branchId);
    const matchFrom = !filters.dateFrom || new Date(s.createdAt) >= new Date(filters.dateFrom);
    const matchTo = !filters.dateTo || new Date(s.createdAt) <= new Date(filters.dateTo + 'T23:59:59');
    return matchStatus && matchType && matchBranch && matchFrom && matchTo;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const statusCounts = SHIPMENT_STATUSES.map(s => ({
    status: s,
    count: filtered.filter(sh => sh.status === s).length,
  })).filter(s => s.count > 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="page-header mb-0">Shipment Report</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} records</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 w-fit print:hidden">
          <FiPrinter size={16} /> Print Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6 print:hidden">
        {statusCounts.slice(0, 8).map(s => (
          <div key={s.status} className="card py-3">
            <StatusBadge status={s.status} />
            <p className="text-xl font-bold text-gray-800 mt-2">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-5 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select className="input-field" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field" value={filters.deliveryType} onChange={e => setFilters(p => ({ ...p, deliveryType: e.target.value }))}>
            <option value="">All Types</option>
            {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input-field" value={filters.branchId} onChange={e => setFilters(p => ({ ...p, branchId: e.target.value }))}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input type="date" className="input-field" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} placeholder="From" />
          <input type="date" className="input-field" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} placeholder="To" />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Tracking #</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Customer</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Destination</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">No data for selected filters</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono font-medium text-gray-700">{s.trackingNumber}</td>
                <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{getCustomerName(s.customerId)}</td>
                <td className="py-3 px-4 hidden md:table-cell text-gray-600">{s.receiverCity}, {s.receiverState}</td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.deliveryType === 'Same Day' ? 'bg-red-50 text-red-700' : s.deliveryType === 'Express' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{s.deliveryType}</span>
                </td>
                <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShipmentReport;
