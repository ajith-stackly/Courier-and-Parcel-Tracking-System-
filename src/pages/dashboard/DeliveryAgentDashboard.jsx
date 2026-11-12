import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipmentsByAgent } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { FiPackage, FiClock, FiCheckCircle, FiAlertTriangle, FiCalendar } from 'react-icons/fi';

const DeliveryAgentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getShipmentsByAgent(user?.agentId);
        const data = res.data;
        const today = new Date().toISOString().split('T')[0];

        setStats({
          assigned: data.length,
          todaysDeliveries: data.filter(s => s.expectedDeliveryDate === today || s.actualDeliveryDate?.startsWith(today)).length,
          pending: data.filter(s => ['Agent Assigned', 'Accepted', 'Out for Delivery'].includes(s.status)).length,
          completed: data.filter(s => s.status === 'Delivered').length,
          failed: data.filter(s => s.status === 'Delivery Failed').length,
        });
        setShipments(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const statCards = [
    { label: 'Assigned Shipments', value: stats.assigned, icon: <FiPackage />, color: 'bg-blue-500' },
    { label: "Today's Deliveries", value: stats.todaysDeliveries, icon: <FiCalendar />, color: 'bg-cyan-500' },
    { label: 'Pending', value: stats.pending, icon: <FiClock />, color: 'bg-orange-500' },
    { label: 'Completed', value: stats.completed, icon: <FiCheckCircle />, color: 'bg-green-500' },
    { label: 'Failed', value: stats.failed, icon: <FiAlertTriangle />, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="page-header">Delivery Agent Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">My Shipments</h2>
        {shipments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No shipments assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Tracking #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Receiver</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Address</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/shipments/${s.id}`} className="text-primary-600 font-medium">{s.trackingNumber}</Link>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{s.receiverName}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600 max-w-[200px] truncate">{s.receiverAddress}, {s.receiverCity}</td>
                    <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 px-4">
                      {['Agent Assigned', 'Accepted', 'Out for Delivery'].includes(s.status) && (
                        <Link to={`/deliveries/confirm/${s.id}`} className="text-xs btn-primary py-1 px-2">
                          Update
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryAgentDashboard;
