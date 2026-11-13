import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiMapPin, FiPhone, FiUser, FiHash } from 'react-icons/fi';
import { getBranch } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const BranchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        setLoading(true);
        const response = await getBranch(id);
        setBranch(response.data);
      } catch (err) {
        toast.error('Failed to load branch details');
        navigate('/branches');
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [id, navigate, toast]);

  if (loading) return <LoadingSpinner text="Loading branch details..." />;
  if (!branch) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/branches')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{branch.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                branch.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {branch.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Branch Details</p>
          </div>
        </div>
        <Link to={`/branches/edit/${id}`} className="btn-primary flex items-center gap-2">
          <FiEdit2 size={16} />
          Edit Branch
        </Link>
      </div>

      {/* Branch Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Branch Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiHash className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Branch Code</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{branch.code}</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <FiPhone className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Contact</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{branch.contact || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <FiUser className="text-amber-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Manager</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{branch.manager || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiMapPin className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {branch.address}{branch.city ? `, ${branch.city}` : ''}
                {branch.state ? `, ${branch.state}` : ''}
              </p>
            </div>
          </div>
        </div>
        {branch.createdAt && (
          <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            Branch created on {formatDate(branch.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
};

export default BranchDetail;
