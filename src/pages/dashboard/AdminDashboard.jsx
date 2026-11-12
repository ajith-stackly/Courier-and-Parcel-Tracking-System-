import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getShipments, getBranches, getAgents, getPayments } from '../../api/api';
import { formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { FiPackage, FiTruck, FiMapPin, FiDollarSign, FiUsers, FiCheckCircle, FiAlertTriangle, FiRotateCcw, FiArrowRight } from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipmentsRes, branchesRes, agentsRes, paymentsRes] = await Promise.all([
          getShipments(), getBranches(), getAgents(), getPayments(),
        ]);
        const shipments = shipmentsRes.data;
        const branches = branchesRes.data;
        const agents = agentsRes.data;
        const payments = paymentsRes.data;

        const totalRevenue = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);

        setStats({
          totalShipments: shipments.length,
          inTransit: shipments.filter(s => s.status === 'In Transit').length,
          outForDelivery: shipments.filter(s => s.status === 'Out for Delivery').length,
          delivered: shipments.filter(s => s.status === 'Delivered').length,
          failed: shipments.filter(s => s.status === 'Delivery Failed').length,
          returned: shipments.filter(s => s.status === 'Returned to Sender').length,
          revenue: totalRevenue,
          branches: branches.filter(b => b.status === 'active').length,
          availableAgents: agents.filter(a => a.availability === 'available').length,
          totalAgents: agents.length,
        });
        setRecentShipments(shipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const statCards = [
    { label: 'Total Shipments', value: stats.totalShipments, icon: <FiPackage />, color: 'bg-blue-500', link: '/shipments' },
    { label: 'In Transit', value: stats.inTransit, icon: <FiTruck />, color: 'bg-yellow-500', link: '/shipments' },
    { label: 'Out for Delivery', value: stats.outForDelivery, icon: <FiTruck />, color: 'bg-orange-500', link: '/deliveries' },
    { label: 'Delivered', value: stats.delivered, icon: <FiCheckCircle />, color: 'bg-green-500', link: '/shipments' },
    { label: 'Failed', value: stats.failed, icon: <FiAlertTriangle />, color: 'bg-red-500', link: '/shipments' },
    { label: 'Returned', value: stats.returned, icon: <FiRotateCcw />, color: 'bg-rose-500', link: '/shipments' },
    { label: 'Revenue', value: formatCurrency(stats.revenue), icon: <FiDollarSign />, color: 'bg-emerald-500', link: '/payments' },
    { label: 'Active Branches', value: stats.branches, icon: <FiMapPin />, color: 'bg-purple-500', link: '/branches' },
    { label: 'Available Agents', value: `${stats.availableAgents}/${stats.totalAgents}`, icon: <FiUsers />, color: 'bg-indigo-500', link: '/agents' },
  ];

  return (
    <div>
      <h1 className="page-header">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, i) => (
          <Link key={i} to={card.link} className="stat-card hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
            <FiArrowRight className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Recent Shipments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Shipments</h2>
          <Link to="/shipments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Tracking #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Sender</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Destination</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Type</th>
              </tr>
            </thead>
            <tbody>
              {recentShipments.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/shipments/${s.id}`} className="text-primary-600 hover:text-primary-700 font-medium">{s.trackingNumber}</Link>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{s.senderName}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-gray-600">{s.receiverCity}</td>
                  <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{s.deliveryType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
