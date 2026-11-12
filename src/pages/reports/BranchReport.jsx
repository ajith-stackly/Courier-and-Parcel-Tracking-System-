import { useState, useEffect } from 'react';
import { getBranches, getShipments } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FiPrinter, FiMapPin } from 'react-icons/fi';

const BranchReport = () => {
  const toast = useToast();
  const [branches, setBranches] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, sRes] = await Promise.all([getBranches(), getShipments()]);
        setBranches(bRes.data);
        setShipments(sRes.data);
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getBranchStats = (branchId) => {
    const incoming = shipments.filter(s => s.destinationBranchId === branchId).length;
    const outgoing = shipments.filter(s => s.originBranchId === branchId).length;
    const delivered = shipments.filter(s => s.originBranchId === branchId && s.status === 'Delivered').length;
    const failed = shipments.filter(s => s.currentBranchId === branchId && s.status === 'Delivery Failed').length;
    const returned = shipments.filter(s => s.originBranchId === branchId && s.status === 'Returned to Sender').length;
    const processing = shipments.filter(s => s.currentBranchId === branchId && ['Branch Received', 'Processing', 'Arrived at Destination', 'Agent Assigned', 'Out for Delivery'].includes(s.status)).length;
    return { incoming, outgoing, delivered, failed, returned, processing };
  };

  const displayBranches = filterBranch ? branches.filter(b => String(b.id) === String(filterBranch)) : branches;

  const totals = displayBranches.reduce((acc, b) => {
    const s = getBranchStats(b.id);
    return { incoming: acc.incoming + s.incoming, outgoing: acc.outgoing + s.outgoing, delivered: acc.delivered + s.delivered, failed: acc.failed + s.failed, returned: acc.returned + s.returned };
  }, { incoming: 0, outgoing: 0, delivered: 0, failed: 0, returned: 0 });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="page-header mb-0">Branch Report</h1>
          <p className="text-sm text-gray-500 mt-1">{displayBranches.length} branches</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 w-fit print:hidden">
          <FiPrinter size={16} /> Print
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Incoming', value: totals.incoming, color: 'text-blue-700' },
          { label: 'Total Outgoing', value: totals.outgoing, color: 'text-amber-700' },
          { label: 'Delivered', value: totals.delivered, color: 'text-green-700' },
          { label: 'Failed', value: totals.failed, color: 'text-red-700' },
          { label: 'Returned', value: totals.returned, color: 'text-rose-700' },
        ].map((s, i) => (
          <div key={i} className="card py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card mb-5 print:hidden">
        <select className="input-field sm:w-72" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Branch</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Code</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">City</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">Incoming</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">Outgoing</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">Delivered</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Failed</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Returned</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden lg:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayBranches.map(b => {
              const s = getBranchStats(b.id);
              return (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-800">{b.name}</div>
                    <div className="text-xs text-gray-500 hidden sm:block">{b.manager}</div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell font-mono text-gray-600">{b.code}</td>
                  <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{b.city}</td>
                  <td className="py-3 px-4 text-center font-semibold text-blue-700">{s.incoming}</td>
                  <td className="py-3 px-4 text-center font-semibold text-amber-700">{s.outgoing}</td>
                  <td className="py-3 px-4 text-center font-semibold text-green-700">{s.delivered}</td>
                  <td className="py-3 px-4 text-center font-semibold text-red-700 hidden lg:table-cell">{s.failed}</td>
                  <td className="py-3 px-4 text-center font-semibold text-rose-700 hidden lg:table-cell">{s.returned}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BranchReport;
