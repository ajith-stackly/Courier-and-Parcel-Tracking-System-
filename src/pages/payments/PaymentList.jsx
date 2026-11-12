import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPayments, getPaymentsByCustomer, getShipments, getCustomers } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { formatDate, formatCurrency, paginate } from '../../utils/helpers';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/constants';
import { FiDollarSign, FiSearch, FiFilter } from 'react-icons/fi';

const PaymentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', method: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          user.role === 'customer' ? getPaymentsByCustomer(user.customerId) : getPayments(),
          getCustomers(),
        ]);
        setPayments(pRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setCustomers(cRes.data);
      } catch { toast.error('Failed to load payments'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const getCustomerName = (customerId) => customers.find(c => c.id === customerId)?.name || '-';

  const statusColors = {
    'Paid': 'bg-green-100 text-green-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Failed': 'bg-red-100 text-red-800',
    'Refunded': 'bg-blue-100 text-blue-800',
  };

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const customer = customers.find(c => String(c.id) === String(p.customerId));
    const matchSearch = !q || [
      p.trackingNumber,
      p.transactionRef,
      customer?.name,
      customer?.phone,
    ].some(value => String(value || '').toLowerCase().includes(q));
    const matchStatus = !filters.status || p.status === filters.status;
    const matchMethod = !filters.method || p.method === filters.method;
    const matchFrom = !filters.dateFrom || new Date(p.date) >= new Date(filters.dateFrom);
    const matchTo = !filters.dateTo || new Date(p.date) <= new Date(filters.dateTo + 'T23:59:59');
    return matchSearch && matchStatus && matchMethod && matchFrom && matchTo;
  });

  const { data: paginated, totalPages, currentPage } = paginate(filtered, page);

  const totalPaid = filtered.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filtered.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="page-header">{user.role === 'customer' ? 'My Payments' : 'Payments'}</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: formatCurrency(filtered.reduce((s,p) => s+p.amount, 0)), color: 'text-gray-800' },
          { label: 'Paid', value: formatCurrency(totalPaid), color: 'text-green-700' },
          { label: 'Pending', value: formatCurrency(totalPending), color: 'text-yellow-700' },
          { label: 'Refunded', value: formatCurrency(filtered.filter(p => p.status === 'Refunded').reduce((s,p) => s+p.amount, 0)), color: 'text-blue-700' },
        ].map((s, i) => (
          <div key={i} className="card py-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4 space-y-3">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={18} />
            <input className="input-field pl-10" placeholder="Search tracking #, ref, customer, phone..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input-field sm:w-40" value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}>
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field sm:w-36" value={filters.method} onChange={e => { setFilters(p => ({ ...p, method: e.target.value })); setPage(1); }}>
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1">
            <label className="label text-xs">From Date</label>
            <input type="date" className="input-field" value={filters.dateFrom} onChange={e => { setFilters(p => ({ ...p, dateFrom: e.target.value })); setPage(1); }} />
          </div>
          <div className="flex-1">
            <label className="label text-xs">To Date</label>
            <input type="date" className="input-field" value={filters.dateTo} onChange={e => { setFilters(p => ({ ...p, dateTo: e.target.value })); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="table-container">
        {paginated.length === 0 ? (
          <EmptyState title="No payments found" icon={<FiDollarSign size={48} className="mb-3 text-gray-300" />} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tracking #</th>
                  {user.role !== 'customer' && <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Customer</th>}
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Ref #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/shipments/${p.shipmentId}`} className="text-primary-600 font-medium hover:underline font-mono">{p.trackingNumber}</Link>
                    </td>
                    {user.role !== 'customer' && <td className="py-3 px-4 hidden sm:table-cell text-gray-700">{getCustomerName(p.customerId)}</td>}
                    <td className="py-3 px-4 font-semibold text-gray-800">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600">{p.method}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-xs font-mono">{p.transactionRef}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(p.date)}</td>
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

export default PaymentList;
