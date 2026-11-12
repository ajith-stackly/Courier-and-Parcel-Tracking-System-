import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipments, getShipmentsByCustomer, getBranches } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { canAccessShipment, searchData, paginate, formatDate, formatCurrency } from '../../utils/helpers';
import { SHIPMENT_STATUSES, DELIVERY_TYPES } from '../../utils/constants';
import { FiPlus, FiSearch, FiEye, FiPackage, FiFilter, FiX } from 'react-icons/fi';

const ShipmentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [shipments, setShipments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', deliveryType: '', branchId: '', destinationId: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const PER_PAGE = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [shipmentsRes, branchesRes] = await Promise.all([
          user.role === 'customer' ? getShipmentsByCustomer(user.customerId) : getShipments(),
          getBranches(),
        ]);
        setShipments(shipmentsRes.data
          .filter(shipment => canAccessShipment(user, shipment))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setBranches(branchesRes.data);
      } catch { toast.error('Failed to load shipments'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || [s.trackingNumber, s.senderName, s.receiverName, s.senderPhone, s.receiverPhone, s.receiverCity].some(v => String(v || '').toLowerCase().includes(q));
    const matchStatus = !filters.status || s.status === filters.status;
    const matchType = !filters.deliveryType || s.deliveryType === filters.deliveryType;
    const matchBranch = !filters.branchId || String(s.currentBranchId) === String(filters.branchId);
    const matchDestination = !filters.destinationId || String(s.destinationBranchId) === String(filters.destinationId);
    const createdAt = new Date(s.createdAt);
    const matchFrom = !filters.dateFrom || createdAt >= new Date(`${filters.dateFrom}T00:00:00`);
    const matchTo = !filters.dateTo || createdAt <= new Date(`${filters.dateTo}T23:59:59`);
    return matchSearch && matchStatus && matchType && matchBranch && matchDestination && matchFrom && matchTo;
  });

  const { data: paginated, totalPages, currentPage } = paginate(filtered, page, PER_PAGE);

  const clearFilters = () => { setFilters({ status: '', deliveryType: '', branchId: '', destinationId: '', dateFrom: '', dateTo: '' }); setSearch(''); setPage(1); };
  const hasFilters = Object.values(filters).some(Boolean) || search;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="page-header mb-0">Shipments</h1>
        {['admin', 'branch_staff', 'customer'].includes(user.role) && (
          <Link to="/shipments/new" className="btn-primary flex items-center gap-2 w-fit">
            <FiPlus size={18} /> New Shipment
          </Link>
        )}
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={18} />
            <input className="input-field pl-10" placeholder="Search tracking number, name, phone..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <FiFilter size={16} /> Filters {hasFilters && <span className="w-2 h-2 bg-primary-500 rounded-full"></span>}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <FiX size={16} /> Clear
            </button>
          )}
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Status</label>
              <select className="input-field text-sm" value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}>
                <option value="">All Statuses</option>
                {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Delivery Type</label>
              <select className="input-field text-sm" value={filters.deliveryType} onChange={e => { setFilters(p => ({ ...p, deliveryType: e.target.value })); setPage(1); }}>
                <option value="">All Types</option>
                {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {user.role !== 'customer' && (
              <div>
                <label className="label text-xs">Branch</label>
                <select className="input-field text-sm" value={filters.branchId} onChange={e => { setFilters(p => ({ ...p, branchId: e.target.value })); setPage(1); }}>
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label text-xs">Destination</label>
              <select className="input-field text-sm" value={filters.destinationId} onChange={e => { setFilters(p => ({ ...p, destinationId: e.target.value })); setPage(1); }}>
                <option value="">All Destinations</option>
                {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Created From</label>
              <input type="date" className="input-field text-sm" value={filters.dateFrom} onChange={e => { setFilters(p => ({ ...p, dateFrom: e.target.value })); setPage(1); }} />
            </div>
            <div>
              <label className="label text-xs">Created To</label>
              <input type="date" className="input-field text-sm" value={filters.dateTo} onChange={e => { setFilters(p => ({ ...p, dateTo: e.target.value })); setPage(1); }} />
            </div>
          </div>
        )}
      </div>

      <div className="table-container">
        {paginated.length === 0 ? (
          <EmptyState title="No shipments found" message="Adjust search or filters." icon={<FiPackage size={48} className="mb-3 text-gray-300" />} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tracking #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Sender → Receiver</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Destination</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden xl:table-cell">Charge</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/shipments/${s.id}`} className="text-primary-600 font-medium hover:underline">{s.trackingNumber}</Link>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="text-gray-800">{s.senderName}</div>
                      <div className="text-xs text-gray-500">→ {s.receiverName}</div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600">{s.receiverCity}, {s.receiverState}</td>
                    <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${s.deliveryType === 'Same Day' ? 'bg-red-50 text-red-700' : s.deliveryType === 'Express' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{s.deliveryType}</span>
                    </td>
                    <td className="py-3 px-4 hidden xl:table-cell text-gray-700 font-medium">{formatCurrency(s.deliveryCharge)}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => navigate(`/shipments/${s.id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEye size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2 text-right">Showing {filtered.length} of {shipments.length} shipments</p>
    </div>
  );
};

export default ShipmentList;
