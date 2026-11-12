import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiSearch, FiUsers } from 'react-icons/fi';
import { getCustomers, getShipments, deleteCustomer } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { searchData, paginate, sortData } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const TERMINAL_SHIPMENT_STATUSES = ['Delivered', 'Cancelled', 'Returned to Sender'];

const CustomerList = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [deleteModal, setDeleteModal] = useState({ open: false, customer: null });
  const [deleting, setDeleting] = useState(false);

  const perPage = 10;

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.customer) return;
    try {
      setDeleting(true);
      let shipments;
      try {
        const response = await getShipments();
        shipments = response.data;
      } catch (err) {
        toast.error('Unable to verify customer shipments; deletion was not completed');
        return;
      }

      const hasActiveShipments = shipments.some(shipment =>
        String(shipment.customerId) === String(deleteModal.customer.id) &&
        !TERMINAL_SHIPMENT_STATUSES.includes(shipment.status)
      );
      if (hasActiveShipments) {
        toast.error('Cannot delete a customer with active shipments');
        return;
      }

      await deleteCustomer(deleteModal.customer.id);
      toast.success('Customer deleted successfully');
      setDeleteModal({ open: false, customer: null });
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = searchData(customers, searchQuery, ['name', 'email', 'phone']);
  const sorted = sortData(filtered, sortField, sortDirection);
  const { data: paginatedData, totalPages } = paginate(sorted, currentPage, perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) return <LoadingSpinner text="Loading customers..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} customer{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={() => navigate('/customers/new')} className="btn-primary flex items-center gap-2">
          <FiPlus size={18} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No customers found"
          message={searchQuery ? 'Try adjusting your search query.' : 'Add your first customer to get started.'}
          icon={<FiUsers size={48} className="mb-3 text-gray-300" />}
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
                  <th
                    className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-800"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">City</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">State</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{customer.phone}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{customer.city || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{customer.state || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FiEye size={16} />
                        </Link>
                        <Link
                          to={`/customers/edit/${customer.id}`}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, customer })}
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
        onClose={() => setDeleteModal({ open: false, customer: null })}
        title="Delete Customer"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">{deleteModal.customer?.name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModal({ open: false, customer: null })}
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

export default CustomerList;
