import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiSearch, FiTruck } from 'react-icons/fi';
import { getAgents, getBranches, getShipments, deleteAgent } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { searchData, paginate, sortData, filterData } from '../../utils/helpers';
import { AGENT_AVAILABILITY } from '../../utils/constants';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const TERMINAL_SHIPMENT_STATUSES = ['Delivered', 'Cancelled', 'Returned to Sender'];

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

const AgentList = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [agents, setAgents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [deleteModal, setDeleteModal] = useState({ open: false, agent: null });
  const [deleting, setDeleting] = useState(false);

  const perPage = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [agentsRes, branchesRes] = await Promise.all([getAgents(), getBranches()]);
      setAgents(agentsRes.data);
      setBranches(branchesRes.data);
    } catch (err) {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const branchMap = branches.reduce((acc, b) => {
    acc[b.id] = b.name;
    return acc;
  }, {});

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.agent) return;
    try {
      setDeleting(true);
      let shipments;
      try {
        const response = await getShipments();
        shipments = response.data;
      } catch (err) {
        toast.error('Unable to verify agent assignments; deletion was not completed');
        return;
      }

      const hasActiveAssignments = shipments.some(shipment =>
        String(shipment.agentId) === String(deleteModal.agent.id) &&
        !TERMINAL_SHIPMENT_STATUSES.includes(shipment.status)
      );
      if (hasActiveAssignments || deleteModal.agent.availability === 'on_delivery') {
        toast.error('Cannot delete an agent with active shipment assignments');
        return;
      }

      await deleteAgent(deleteModal.agent.id);
      toast.success('Agent deleted successfully');
      setDeleteModal({ open: false, agent: null });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  const searched = searchData(agents, searchQuery, ['name', 'email', 'phone']);
  const filtered = filterData(searched, {
    branchId: branchFilter,
    availability: availabilityFilter,
  });
  const sorted = sortData(filtered, sortField, sortDirection);
  const { data: paginatedData, totalPages } = paginate(sorted, currentPage, perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, branchFilter, availabilityFilter]);

  if (loading) return <LoadingSpinner text="Loading agents..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Delivery Agents</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} agent{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={() => navigate('/agents/new')} className="btn-primary flex items-center gap-2">
          <FiPlus size={18} />
          Add Agent
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Availability</option>
              {AGENT_AVAILABILITY.map(a => (
                <option key={a} value={a}>{AVAILABILITY_LABELS[a] || a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No agents found"
          message={searchQuery || branchFilter !== 'all' || availabilityFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Add your first delivery agent to get started.'}
          icon={<FiTruck size={48} className="mb-3 text-gray-300" />}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Branch</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Vehicle</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Availability</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{agent.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{agent.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{agent.phone}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {branchMap[agent.branchId] || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {agent.vehicleType || '-'}
                      {agent.vehicleNumber ? ` (${agent.vehicleNumber})` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        AVAILABILITY_COLORS[agent.availability] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {AVAILABILITY_LABELS[agent.availability] || agent.availability}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/agents/${agent.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FiEye size={16} />
                        </Link>
                        <Link
                          to={`/agents/edit/${agent.id}`}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, agent })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, agent: null })}
        title="Delete Agent"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">{deleteModal.agent?.name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModal({ open: false, agent: null })}
            className="btn-secondary"
            disabled={deleting}
          >
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AgentList;
