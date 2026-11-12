import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipments, getAgentsByBranch } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { FiPackage, FiArrowDown, FiArrowUp, FiClock, FiTruck, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

const BranchStaffDashboard = () => {
  const { user } = useAuth();
  const branchId = user?.branchId;
  const [stats, setStats] = useState(null);
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipmentsRes, agentsRes] = await Promise.all([
          getShipments(),
          getAgentsByBranch(branchId),
        ]);
        const allShipments = shipmentsRes.data;
        const branchShipments = allShipments.filter(s => s.currentBranchId === branchId || s.originBranchId === branchId || s.destinationBranchId === branchId);
        const today = new Date().toISOString().split('T')[0];

        setStats({
          todaysShipments: branchShipments.filter(s => s.createdAt?.startsWith(today)).length,
          incoming: allShipments.filter(s => s.destinationBranchId === branchId && s.status === 'In Transit').length,
          outgoing: allShipments.filter(s => s.originBranchId === branchId && s.status === 'In Transit').length,
          pendingAssignment: allShipments.filter(s => s.currentBranchId === branchId && s.status === 'Arrived at Destination').length,
          outForDelivery: allShipments.filter(s => s.currentBranchId === branchId && s.status === 'Out for Delivery').length,
          delivered: branchShipments.filter(s => s.status === 'Delivered').length,
        });
        setRecentShipments(branchShipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const statCards = [
    { label: "Today's Shipments", value: stats.todaysShipments, icon: <FiPackage />, color: 'bg-blue-500' },
    { label: 'Incoming', value: stats.incoming, icon: <FiArrowDown />, color: 'bg-cyan-500' },
    { label: 'Outgoing', value: stats.outgoing, icon: <FiArrowUp />, color: 'bg-amber-500' },
    { label: 'Pending Assignment', value: stats.pendingAssignment, icon: <FiClock />, color: 'bg-orange-500' },
    { label: 'Out for Delivery', value: stats.outForDelivery, icon: <FiTruck />, color: 'bg-yellow-500' },
    { label: 'Delivered', value: stats.delivered, icon: <FiCheckCircle />, color: 'bg-green-500' },
  ];

  return (
    <div>
      <h1 className="page-header">Branch Staff Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Branch Shipments</h2>
          <Link to="/shipments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Tracking #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Receiver</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Destination</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentShipments.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/shipments/${s.id}`} className="text-primary-600 hover:text-primary-700 font-medium">{s.trackingNumber}</Link>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{s.receiverName}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-gray-600">{s.receiverCity}</td>
                  <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BranchStaffDashboard;
