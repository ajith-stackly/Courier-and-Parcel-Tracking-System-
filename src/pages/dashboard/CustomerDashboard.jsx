import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getShipmentsByCustomer, getTrackingHistory } from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/helpers';
import { FiPackage, FiTruck, FiCheckCircle, FiClock, FiPlus, FiSearch } from 'react-icons/fi';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getShipmentsByCustomer(user?.customerId);
        const data = res.data;

        const active = data.filter(s => !['Delivered', 'Cancelled', 'Returned to Sender'].includes(s.status));
        const upcoming = data.filter(s => s.status === 'Out for Delivery');

        setStats({
          activeShipments: active.length,
          upcomingDelivery: upcoming.length,
          totalShipments: data.length,
          inTransit: data.filter(s => s.status === 'In Transit').length,
          delivered: data.filter(s => s.status === 'Delivered').length,
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
    { label: 'Active Shipments', value: stats.activeShipments, icon: <FiPackage />, color: 'bg-blue-500' },
    { label: 'Upcoming Delivery', value: stats.upcomingDelivery, icon: <FiClock />, color: 'bg-orange-500' },
    { label: 'Total Shipments', value: stats.totalShipments, icon: <FiPackage />, color: 'bg-purple-500' },
    { label: 'In Transit', value: stats.inTransit, icon: <FiTruck />, color: 'bg-yellow-500' },
    { label: 'Delivered', value: stats.delivered, icon: <FiCheckCircle />, color: 'bg-green-500' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Dashboard</h1>
        <div className="flex gap-2 mt-3 sm:mt-0">
          <Link to="/shipments/new" className="btn-primary flex items-center gap-1 text-sm">
            <FiPlus size={16} /> New Shipment
          </Link>
          <Link to="/tracking" className="btn-secondary flex items-center gap-1 text-sm">
            <FiSearch size={16} /> Track Parcel
          </Link>
        </div>
      </div>

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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Shipments</h2>
        {shipments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-3">You haven't created any shipments yet.</p>
            <Link to="/shipments/new" className="btn-primary text-sm">Create Your First Shipment</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Tracking #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Receiver</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Destination</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Expected</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 10).map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link to={`/shipments/${s.id}`} className="text-primary-600 font-medium">{s.trackingNumber}</Link>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{s.receiverName}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600">{s.receiverCity}</td>
                    <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-600">{formatDate(s.expectedDeliveryDate)}</td>
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

export default CustomerDashboard;
