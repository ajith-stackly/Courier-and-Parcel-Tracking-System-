import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getShipmentByTracking, getTrackingByNumber } from '../../api/api';
import { formatDateTime, formatDate } from '../../utils/helpers';
import StatusBadge from '../../components/StatusBadge';
import { FiSearch, FiPackage, FiMapPin, FiClock, FiCheck, FiTruck, FiAlertTriangle } from 'react-icons/fi';

const TrackParcel = () => {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [shipment, setShipment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tn = params.get('tn');
    if (tn) { setQuery(tn); handleSearch(tn); }
  }, []);

  const handleSearch = async (trackingNum) => {
    const tn = (trackingNum || query).trim().toUpperCase();
    if (!tn) { setError('Please enter a tracking number'); return; }
    setLoading(true);
    setError('');
    setShipment(null);
    setHistory([]);
    setSearched(true);
    try {
      const res = await getShipmentByTracking(tn);
      if (res.data.length === 0) { setError('No shipment found with this tracking number.'); setLoading(false); return; }
      const s = res.data[0];
      setShipment(s);
      const hRes = await getTrackingByNumber(tn);
      setHistory(hRes.data);
    } catch { setError('Failed to track parcel. Please try again.'); }
    finally { setLoading(false); }
  };

  const statusIcons = {
    'Shipment Created': <FiPackage size={16} />,
    'Branch Received': <FiMapPin size={16} />,
    'Processing': <FiClock size={16} />,
    'In Transit': <FiTruck size={16} />,
    'Arrived at Destination': <FiMapPin size={16} />,
    'Agent Assigned': <FiTruck size={16} />,
    'Out for Delivery': <FiTruck size={16} />,
    'Delivered': <FiCheck size={16} />,
    'Delivery Failed': <FiAlertTriangle size={16} />,
    'Cancelled': <FiAlertTriangle size={16} />,
    'Returned to Sender': <FiPackage size={16} />,
  };

  const statusColors = {
    'Delivered': 'bg-green-500', 'Delivery Failed': 'bg-red-500',
    'Cancelled': 'bg-gray-400', 'Returned to Sender': 'bg-rose-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
            <FiPackage size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Track Your Parcel</h1>
          <p className="text-primary-200">Enter your tracking number to get real-time updates</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6 border border-gray-100">
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800 font-mono tracking-wider"
                placeholder="e.g. CTK20261234567"
                value={query}
                onChange={e => { setQuery(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={() => handleSearch()} disabled={loading}
              className="btn-primary py-3 px-6 rounded-xl text-base flex items-center gap-2 justify-center">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FiSearch size={18} />}
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 flex items-center gap-1"><FiAlertTriangle size={14}/> {error}</p>}
        </div>

        {/* Result */}
        {shipment && (
          <div className="space-y-5 mb-10">
            {/* Status card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tracking Number</p>
                  <p className="text-xl font-bold font-mono text-gray-800">{shipment.trackingNumber}</p>
                  <div className="mt-2"><StatusBadge status={shipment.status} size="lg" /></div>
                </div>
                <div className="sm:text-right space-y-1">
                  <div>
                    <p className="text-xs text-gray-500">Expected Delivery</p>
                    <p className="font-semibold text-gray-700">{formatDate(shipment.expectedDeliveryDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Delivery Type</p>
                    <p className="text-sm font-medium text-gray-600">{shipment.deliveryType}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From</p>
                  <p className="font-medium text-gray-800">{shipment.senderName}</p>
                  <p className="text-sm text-gray-600">{shipment.senderCity}, {shipment.senderState}</p>
                  <p className="text-sm text-gray-500">{shipment.senderPincode}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">To</p>
                  <p className="font-medium text-gray-800">{shipment.receiverName}</p>
                  <p className="text-sm text-gray-600">{shipment.receiverCity}, {shipment.receiverState}</p>
                  <p className="text-sm text-gray-500">{shipment.receiverPincode}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
                <div><span className="text-gray-500">Weight: </span><span className="font-medium">{shipment.weight} kg</span></div>
                <div><span className="text-gray-500">Type: </span><span className="font-medium">{shipment.parcelType}</span></div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-5">Tracking History</h3>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {[...history].reverse().map((h, idx) => {
                    const isFirst = idx === 0;
                    const dotColor = statusColors[h.status] || (isFirst ? 'bg-primary-600' : 'bg-gray-300');
                    return (
                      <div key={h.id} className="relative flex gap-4">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dotColor} ${isFirst ? 'ring-4 ring-primary-100' : ''}`}>
                          <span className="text-white">{statusIcons[h.status] || <FiPackage size={14} />}</span>
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <p className={`font-semibold ${isFirst ? 'text-primary-700' : 'text-gray-700'}`}>{h.status}</p>
                              <p className="text-sm text-gray-500">{h.location}</p>
                              {h.remarks && <p className="text-xs text-gray-400 mt-0.5 italic">{h.remarks}</p>}
                            </div>
                            <p className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(h.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {searched && !shipment && !loading && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <FiPackage size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No shipment found</p>
          </div>
        )}

        {!searched && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <FiTruck size={48} className="mx-auto text-primary-200 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-1">Real-time Parcel Tracking</h2>
            <p className="text-gray-500 text-sm">Enter your tracking number above to get instant updates on your parcel's location and delivery status.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackParcel;
