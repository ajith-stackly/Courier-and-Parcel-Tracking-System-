import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiSearch, FiFilter, FiMapPin } from 'react-icons/fi';
import { getBranches, getShipments, getTransfers, getAgents, deleteBranch } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { searchData, paginate, sortData, filterData } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const TERMINAL_SHIPMENT_STATUSES = ['Delivered', 'Cancelled', 'Returned to Sender'];
const TERMINAL_TRANSFER_STATUSES = ['Completed', 'Delivered', 'Cancelled', 'Returned to Sender'];

const BranchList = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [deleteModal, setDeleteModal] = useState({ open: false, branch: null });
  const [deleting, setDeleting] = useState(false);

  const perPage = 10;

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBranches();
      setBranches(response.data);
    } catch (err) {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.branch) return;
    try {
      setDeleting(true);
      let shipments;
      let transfers;
      let agents;
      try {
        const [shipmentsResponse, transfersResponse, agentsResponse] = await Promise.all([getShipments(), getTransfers(), getAgents()]);
        shipments = shipmentsResponse.data;
        transfers = transfersResponse.data;
        agents = agentsResponse.data;
      } catch (err) {
        toast.error('Unable to verify branch shipments and transfers; deletion was not completed');
        return;
      }

      const branchId = String(deleteModal.branch.id);
      const activeShipments = shipments.filter(shipment =>
        !TERMINAL_SHIPMENT_STATUSES.includes(shipment.status) &&
        [shipment.currentBranchId, shipment.originBranchId, shipment.destinationBranchId]
          .some(referencedBranchId => String(referencedBranchId) === branchId)
      );
      const activeTransfers = transfers.filter(transfer =>
        !TERMINAL_TRANSFER_STATUSES.includes(transfer.status) &&
        [transfer.fromBranchId, transfer.toBranchId]
          .some(referencedBranchId => String(referencedBranchId) === branchId)
      );
      const assignedAgents = agents.filter(agent =>
        String(agent.branchId) === branchId && agent.availability === 'on_delivery'
      );
      const blockers = [];
      if (activeShipments.length) blockers.push(`${activeShipments.length} active shipment${activeShipments.length === 1 ? '' : 's'}`);
      if (activeTransfers.length) blockers.push(`${activeTransfers.length} active transfer${activeTransfers.length === 1 ? '' : 's'}`);
      if (assignedAgents.length) blockers.push(`${assignedAgents.length} agent${assignedAgents.length === 1 ? '' : 's'} on delivery`);
      if (blockers.length) {
        toast.error(`Cannot delete ${deleteModal.branch.name}: ${blockers.join(', ')}. Resolve them first.`);
        return;
      }

      await deleteBranch(deleteModal.branch.id);
      toast.success('Branch deleted successfully');
      setDeleteModal({ open: false, branch: null });
      fetchBranches();
    } catch (error) {
      console.error('Branch deletion failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete branch');
    } finally {
      setDeleting(false);
    }
  };

  const cities = [...new Set(branches.map(b => b.city).filter(Boolean))].sort();
  const statuses = [...new Set(branches.map(b => b.status).filter(Boolean))].sort();

  const searched = searchData(branches, searchQuery, ['name', 'code', 'city', 'contact']);
  const filtered = filterData(searched, { status: statusFilter, city: cityFilter });
  const sorted = sortData(filtered, sortField, sortDirection);
  const { data: paginatedData, totalPages } = paginate(sorted, currentPage, perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, cityFilter]);

  if (loading) return <LoadingSpinner text="Loading branches..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Branches</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} branch{filtered.length !== 1 ? 'es' : ''} found</p>
        </div>
        <button onClick={() => navigate('/branches/new')} className="btn-primary flex items-center gap-2">
          <FiPlus size={18} />
          Add Branch
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Cities</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No branches found"
          message={searchQuery || statusFilter !== 'all' || cityFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Add your first branch to get started.'}
          icon={<FiMapPin size={48} className="mb-3 text-gray-300" />}
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Code</th>
                  <th
                    className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-800 hidden md:table-cell"
                    onClick={() => handleSort('city')}
                  >
                    City {sortField === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Manager</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{branch.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{branch.code}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{branch.city || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{branch.contact || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{branch.manager || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        branch.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {branch.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/branches/${branch.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FiEye size={16} />
                        </Link>
                        <Link
                          to={`/branches/edit/${branch.id}`}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, branch })}
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
        onClose={() => setDeleteModal({ open: false, branch: null })}
        title="Delete Branch"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">{deleteModal.branch?.name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModal({ open: false, branch: null })}
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

export default BranchList;
