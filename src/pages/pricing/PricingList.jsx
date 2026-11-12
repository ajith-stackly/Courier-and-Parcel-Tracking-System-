import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPricing, deletePricingRule } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { formatCurrency } from '../../utils/helpers';
import { DELIVERY_TYPES } from '../../utils/constants';
import { FiPlus, FiEdit2, FiTrash2, FiTag } from 'react-icons/fi';

const PricingList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });

  useEffect(() => {
    getPricing().then(res => setPricing(res.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    try {
      await deletePricingRule(deleteModal.item.id);
      setPricing(prev => prev.filter(p => p.id !== deleteModal.item.id));
      toast.success('Pricing rule deleted');
      setDeleteModal({ open: false, item: null });
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner />;

  const typeColors = { 'Standard': 'bg-gray-100 text-gray-700', 'Express': 'bg-orange-100 text-orange-700', 'Same Day': 'bg-red-100 text-red-700' };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="page-header mb-0">Pricing Configuration</h1>
        <Link to="/pricing/new" className="btn-primary flex items-center gap-2 w-fit"><FiPlus size={18} /> Add Pricing Rule</Link>
      </div>

      <div className="space-y-6">
        {DELIVERY_TYPES.map(type => {
          const rules = pricing.filter(p => p.deliveryType === type).sort((a, b) => a.minWeight - b.minWeight);
          return (
            <div key={type} className="card">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${typeColors[type]}`}>{type}</span>
                <span className="text-sm text-gray-500">{rules[0]?.description}</span>
              </div>
              {rules.length === 0 ? (
                <p className="text-gray-400 text-sm">No pricing rules for this type.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-semibold text-gray-500">Weight Range</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-500">Base Price</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-500">Per Kg</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-500 hidden sm:table-cell">Example (2kg)</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-medium text-gray-700">{r.minWeight}–{r.maxWeight} kg</td>
                          <td className="py-2.5 px-3 text-gray-700">{formatCurrency(r.basePrice)}</td>
                          <td className="py-2.5 px-3 text-gray-700">{formatCurrency(r.pricePerKg)}/kg</td>
                          <td className="py-2.5 px-3 hidden sm:table-cell text-gray-500">{formatCurrency(r.basePrice + 2 * r.pricePerKg)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => navigate(`/pricing/edit/${r.id}`)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={15} /></button>
                              <button onClick={() => setDeleteModal({ open: true, item: r })} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, item: null })} title="Delete Pricing Rule">
        <p className="text-gray-600 mb-6">Delete the {deleteModal.item?.deliveryType} pricing rule for {deleteModal.item?.minWeight}–{deleteModal.item?.maxWeight}kg?</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setDeleteModal({ open: false, item: null })}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
};

export default PricingList;
