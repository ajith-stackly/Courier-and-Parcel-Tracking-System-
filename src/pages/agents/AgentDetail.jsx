import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiMail, FiPhone, FiMapPin, FiTruck, FiPackage } from 'react-icons/fi';
import { getAgent, getBranch, getShipmentsByAgent } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';

const AVAILABILITY_LABELS = {
  available: 'Available',
  on_delivery: 'On Delivery',
  off_duty: 'Off Duty',
};

const AVAILABILITY_COLORS = {
  available: 'bg-green-100 text-green-800',
  on_delivery: 'bg-yellow-100 text-yellow-800',
  off_duty: 'bg-gray-100 text-gray-800',
};

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [agent, setAgent] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [agentRes, shipmentsRes] = await Promise.all([
          getAgent(id),
          getShipmentsByAgent(id),
        ]);
        setAgent(agentRes.data);
        setShipments(Array.isArray(shipmentsRes.data) ? shipmentsRes.data : []);

        // Fetch branch name
        if (agentRes.data.branchId) {
          try {
            const branchRes = await getBranch(agentRes.data.branchId);
            setBranchName(branchRes.data.name);
          } catch {
            setBranchName('-');
          }
        }
      } catch (err) {
        toast.error('Failed to load agent details');
        navigate('/agents');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate, toast]);

  if (loading) return <LoadingSpinner text="Loading agent details..." />;
  if (!agent) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/agents')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{agent.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                AVAILABILITY_COLORS[agent.availability] || 'bg-gray-100 text-gray-800'
              }`}>
                {AVAILABILITY_LABELS[agent.availability] || agent.availability}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Agent Details</p>
          </div>
        </div>
        <Link to={`/agents/${id}/edit`} className="btn-primary flex items-center gap-2">
          <FiEdit2 size={16} />
          Edit Agent
        </Link>
      </div>

      {/* Agent Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Agent Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiMail className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{agent.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <FiPhone className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{agent.phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiMapPin className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Branch</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{branchName || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <FiTruck className="text-amber-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Vehicle</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {agent.vehicleType || '-'}
                {agent.vehicleNumber ? ` — ${agent.vehicleNumber}` : ''}
              </p>
            </div>
          </div>
        </div>
        {agent.createdAt && (
          <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            Agent registered on {formatDate(agent.createdAt)}
          </p>
        )}
      </div>

      {/* Assigned Shipments */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiPackage size={20} />
            Assigned Shipments
            <span className="text-sm font-normal text-gray-500">({shipments.length})</span>
          </h2>
        </div>
        {shipments.length === 0 ? (
          <EmptyState
            title="No assigned shipments"
            message="This agent has no shipments currently assigned."
            icon={<FiPackage size={48} className="mb-3 text-gray-300" />}
          />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tracking #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Receiver</th>
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
                      {shipment.receiverName || '-'}
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

export default AgentDetail;
