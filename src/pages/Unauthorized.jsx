import { Link } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="text-center">
      <FiShield className="mx-auto text-red-500 mb-4" size={64} />
      <h1 className="text-4xl font-bold text-gray-300 mb-2">403</h1>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
      <p className="text-gray-500 mb-6">You don't have permission to access this page.</p>
      <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
    </div>
  </div>
);

export default Unauthorized;
