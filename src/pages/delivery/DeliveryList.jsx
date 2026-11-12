import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipments, getShipmentsByAgent, getAgents } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { canAccessShipment, formatDate, paginate } from '../../utils/helpers';
import { FiTruck, FiSearch, FiFilter } from 'react-icons/fi';

const DeliveryList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [shipments, setShipments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          user.role === 'delivery_agent' ? getShipmentsByAgent(user.agentId) : getShipments(),
          getAgents(),
        ]);
        const deliveryStatuses = ['Agent Assigned', 'Accepted', 'Out for Delivery', 'Delivered', 'Delivery Failed'];
        const data = sRes.data.filter(s => deliveryStatuses.includes(s.status) && canAccessShipment(user, s))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setShipments(data);
        setAgents(aRes.data);
      } catch { toast.error('Failed to load deliveries'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const getAgentName = (agentId) => agents.find(a => a.id === agentId)?.name || '-';

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || [s.trackingNumber, s.receiverName, s.receiverPhone, s.receiverCity].some(v => String(v||'').toLowerCase().includes(q));
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { data: paginated, totalPages, currentPage } = paginate(filtered, page);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="page-header">{user.role === 'delivery_agent' ? 'My Deliveries' : 'Delivery Management'}</h1>

      <div className="card mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-3 text-gray-400" size={18} />
          <input className="input-field pl-10" placeholder="Search tracking, receiver name, phone..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-field sm:w-52" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Delivery Statuses</option>
          <option value="Agent Assigned">Agent Assigned</option>
          <option value="Accepted">Accepted</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Delivery Failed">Delivery Failed</option>
        </select>
      </div>

      <div className="table-container">
        {paginated.length === 0 ? (
          <EmptyState title="No delivery records" icon={<FiTruck size={48} className="mb-3 text-gray-300" />} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tracking #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Receiver</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">Address</th>
                  {user.role !== 'delivery_agent' && <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Agent</th>}
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Expected</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/shipments/${s.id}`} className="text-primary-600 font-medium hover:underline font-mono">{s.trackingNumber}</Link>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="text-gray-800">{s.receiverName}</div>
                      <div className="text-xs text-gray-500">{s.receiverPhone}</div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600 max-w-[180px] truncate">{s.receiverAddress}, {s.receiverCity}</td>
                    {user.role !== 'delivery_agent' && <td className="py-3 px-4 hidden lg:table-cell text-gray-600">{getAgentName(s.agentId)}</td>}
                    <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500">{formatDate(s.expectedDeliveryDate)}</td>
                    <td className="py-3 px-4 text-right">
                      {(['Accepted', 'Out for Delivery'].includes(s.status) ||
                        (s.status === 'Agent Assigned' && user.role === 'delivery_agent')) ? (
                        <button onClick={() => navigate(`/deliveries/confirm/${s.id}`)}
                          className="btn-primary text-xs py-1 px-3">Update</button>
                      ) : (
                        <Link to={`/shipments/${s.id}`} className="btn-secondary text-xs py-1 px-3">View</Link>
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

export default DeliveryList;
