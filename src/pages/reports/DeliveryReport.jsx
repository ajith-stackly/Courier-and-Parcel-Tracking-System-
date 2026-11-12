import { useState, useEffect } from 'react';
import { getShipments, getAgents } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { FiPrinter, FiTruck } from 'react-icons/fi';

const DeliveryReport = () => {
  const toast = useToast();
  const [shipments, setShipments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', agentId: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, aRes] = await Promise.all([getShipments(), getAgents()]);
        const deliveryStatuses = ['Agent Assigned', 'Accepted', 'Out for Delivery', 'Delivered', 'Delivery Failed'];
        setShipments(sRes.data.filter(s => deliveryStatuses.includes(s.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setAgents(aRes.data);
      } catch { toast.error('Failed to load report'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getAgentName = (aid) => agents.find(a => a.id === aid)?.name || '-';

  const filtered = shipments.filter(s => {
    const matchStatus = !filters.status || s.status === filters.status;
    const matchAgent = !filters.agentId || String(s.agentId) === String(filters.agentId);
    const matchFrom = !filters.dateFrom || new Date(s.createdAt) >= new Date(filters.dateFrom);
    const matchTo = !filters.dateTo || new Date(s.createdAt) <= new Date(filters.dateTo + 'T23:59:59');
    return matchStatus && matchAgent && matchFrom && matchTo;
  });

  const stats = {
    total: filtered.length,
    delivered: filtered.filter(s => s.status === 'Delivered').length,
    failed: filtered.filter(s => s.status === 'Delivery Failed').length,
    pending: filtered.filter(s => ['Agent Assigned', 'Accepted', 'Out for Delivery'].includes(s.status)).length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="page-header mb-0">Delivery Report</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} records</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 w-fit print:hidden">
          <FiPrinter size={16} /> Print
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-800' },
          { label: 'Delivered', value: stats.delivered, color: 'text-green-700' },
          { label: 'Failed', value: stats.failed, color: 'text-red-700' },
          { label: 'Pending', value: stats.pending, color: 'text-orange-700' },
        ].map((s, i) => (
          <div key={i} className="card py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-5 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select className="input-field" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="Agent Assigned">Agent Assigned</option>
            <option value="Accepted">Accepted</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Delivery Failed">Delivery Failed</option>
          </select>
          <select className="input-field" value={filters.agentId} onChange={e => setFilters(p => ({ ...p, agentId: e.target.value }))}>
            <option value="">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="date" className="input-field" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} />
          <input type="date" className="input-field" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} />
        </div>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Tracking #</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Receiver</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Agent</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Expected</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Actual</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">No delivery records for filters</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono font-medium text-gray-700">{s.trackingNumber}</td>
                <td className="py-3 px-4 hidden sm:table-cell text-gray-600">
                  <div>{s.receiverName}</div>
                  <div className="text-xs text-gray-400">{s.receiverCity}</div>
                </td>
                <td className="py-3 px-4 hidden md:table-cell text-gray-600">{getAgentName(s.agentId)}</td>
                <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(s.expectedDeliveryDate)}</td>
                <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(s.actualDeliveryDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryReport;
