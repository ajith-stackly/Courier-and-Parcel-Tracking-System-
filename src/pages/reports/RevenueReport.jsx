import { useState, useEffect } from 'react';
import { getPayments, getCustomers, getShipments } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/constants';
import { FiPrinter, FiTrendingUp } from 'react-icons/fi';

const RevenueReport = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', method: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([getPayments(), getCustomers()]);
        setPayments(pRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setCustomers(cRes.data);
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getCustomerName = (cid) => customers.find(c => c.id === cid)?.name || 'Walk-in';

  const filtered = payments.filter(p => {
    const matchStatus = !filters.status || p.status === filters.status;
    const matchMethod = !filters.method || p.method === filters.method;
    const matchFrom = !filters.dateFrom || new Date(p.date) >= new Date(filters.dateFrom);
    const matchTo = !filters.dateTo || new Date(p.date) <= new Date(filters.dateTo + 'T23:59:59');
    return matchStatus && matchMethod && matchFrom && matchTo;
  });

  const stats = {
    total: filtered.reduce((s, p) => s + p.amount, 0),
    paid: filtered.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
    pending: filtered.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0),
    refunded: filtered.filter(p => p.status === 'Refunded').reduce((s, p) => s + p.amount, 0),
    failed: filtered.filter(p => p.status === 'Failed').reduce((s, p) => s + p.amount, 0),
  };

  const statusColors = { Paid: 'bg-green-100 text-green-800', Pending: 'bg-yellow-100 text-yellow-800', Failed: 'bg-red-100 text-red-800', Refunded: 'bg-blue-100 text-blue-800' };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="page-header mb-0">Revenue Report</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} transactions</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 w-fit print:hidden">
          <FiPrinter size={16} /> Print
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.total), color: 'text-gray-800', bg: 'bg-gray-50' },
          { label: 'Paid', value: formatCurrency(stats.paid), color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Pending', value: formatCurrency(stats.pending), color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Refunded', value: formatCurrency(stats.refunded), color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className={`card py-4 ${s.bg}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Method Breakdown */}
      <div className="card mb-6 print:hidden">
        <h3 className="font-semibold text-gray-700 mb-3">Revenue by Payment Method</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PAYMENT_METHODS.map(method => {
            const total = filtered.filter(p => p.method === method && p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
            return (
              <div key={method} className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">{method}</p>
                <p className="font-bold text-gray-800">{formatCurrency(total)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-5 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select className="input-field" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field" value={filters.method} onChange={e => setFilters(p => ({ ...p, method: e.target.value }))}>
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
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
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Customer</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Method</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">No data for selected filters</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono font-medium text-gray-700">{p.trackingNumber}</td>
                <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{getCustomerName(p.customerId)}</td>
                <td className="py-3 px-4 font-semibold text-gray-800">{formatCurrency(p.amount)}</td>
                <td className="py-3 px-4 hidden md:table-cell text-gray-600">{p.method}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>{p.status}</span>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(p.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenueReport;
