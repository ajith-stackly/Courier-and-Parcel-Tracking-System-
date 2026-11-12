import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiMail, FiPhone, FiMapPin, FiPackage } from 'react-icons/fi';
import { getCustomer, getShipmentsByCustomer } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [customer, setCustomer] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [customerRes, shipmentsRes] = await Promise.all([
          getCustomer(id),
          getShipmentsByCustomer(id),
        ]);
        setCustomer(customerRes.data);
        setShipments(Array.isArray(shipmentsRes.data) ? shipmentsRes.data : []);
      } catch (err) {
        toast.error('Failed to load customer details');
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate, toast]);

  if (loading) return <LoadingSpinner text="Loading customer details..." />;
  if (!customer) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Customer Details</p>
          </div>
        </div>
        <Link to={`/customers/${id}/edit`} className="btn-primary flex items-center gap-2">
          <FiEdit2 size={16} />
          Edit Customer
        </Link>
      </div>

      {/* Customer Info Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiMail className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <FiPhone className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{customer.phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiMapPin className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {customer.address}{customer.city ? `, ${customer.city}` : ''}
                {customer.state ? `, ${customer.state}` : ''}
                {customer.pincode ? ` - ${customer.pincode}` : ''}
              </p>
            </div>
          </div>
        </div>
        {customer.createdAt && (
          <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            Customer since {formatDate(customer.createdAt)}
          </p>
        )}
      </div>

      {/* Shipment History */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiPackage size={20} />
            Shipment History
            <span className="text-sm font-normal text-gray-500">({shipments.length})</span>
          </h2>
        </div>
        {shipments.length === 0 ? (
          <EmptyState
            title="No shipments yet"
            message="This customer has no shipment history."
            icon={<FiPackage size={48} className="mb-3 text-gray-300" />}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tracking #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Destination</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{shipment.trackingNumber}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {shipment.receiverCity || shipment.receiverAddress || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={shipment.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {formatDate(shipment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/shipments/${shipment.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </Link>
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

export default CustomerDetail;
