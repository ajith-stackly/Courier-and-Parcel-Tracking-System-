import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import {
  FiHome, FiPackage, FiUsers, FiMapPin, FiTruck, FiSearch,
  FiRepeat, FiCheckCircle, FiDollarSign, FiTag, FiBarChart2,
  FiX, FiFileText
} from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const SectionTitle = ({ children }) => (
    <p className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{children}</p>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-40 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FiPackage className="text-white text-lg" />
          </div>
          <span className="text-lg font-bold text-gray-800">CourierTrack</span>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
          <FiX size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        <NavLink to="/dashboard" className={linkClass} onClick={onClose}>
          <FiHome size={18} /> Dashboard
        </NavLink>

        {/* Customer role links */}
        {role === ROLES.CUSTOMER && (
          <>
            <NavLink to="/shipments/new" className={linkClass} onClick={onClose}>
              <FiPackage size={18} /> Create Shipment
            </NavLink>
            <NavLink to="/tracking" className={linkClass} onClick={onClose}>
              <FiSearch size={18} /> Track Parcel
            </NavLink>
            <NavLink to="/shipments" className={linkClass} onClick={onClose}>
              <FiFileText size={18} /> My Shipments
            </NavLink>
            <NavLink to="/payments" className={linkClass} onClick={onClose}>
              <FiDollarSign size={18} /> My Payments
            </NavLink>
          </>
        )}

        {/* Admin links */}
        {role === ROLES.ADMIN && (
          <>
            <SectionTitle>Management</SectionTitle>
            <NavLink to="/customers" className={linkClass} onClick={onClose}>
              <FiUsers size={18} /> Customers
            </NavLink>
            <NavLink to="/branches" className={linkClass} onClick={onClose}>
              <FiMapPin size={18} /> Branches
            </NavLink>
            <NavLink to="/agents" className={linkClass} onClick={onClose}>
              <FiTruck size={18} /> Delivery Agents
            </NavLink>

            <SectionTitle>Operations</SectionTitle>
            <NavLink to="/shipments" className={linkClass} onClick={onClose}>
              <FiPackage size={18} /> Shipments
            </NavLink>
            <NavLink to="/tracking" className={linkClass} onClick={onClose}>
              <FiSearch size={18} /> Track Parcel
            </NavLink>
            <NavLink to="/transfers" className={linkClass} onClick={onClose}>
              <FiRepeat size={18} /> Transfers
            </NavLink>
            <NavLink to="/deliveries" className={linkClass} onClick={onClose}>
              <FiCheckCircle size={18} /> Deliveries
            </NavLink>

            <SectionTitle>Finance</SectionTitle>
            <NavLink to="/payments" className={linkClass} onClick={onClose}>
              <FiDollarSign size={18} /> Payments
            </NavLink>
            <NavLink to="/pricing" className={linkClass} onClick={onClose}>
              <FiTag size={18} /> Pricing
            </NavLink>

            <SectionTitle>Reports</SectionTitle>
            <NavLink to="/reports/shipments" className={linkClass} onClick={onClose}>
              <FiBarChart2 size={18} /> Shipment Report
            </NavLink>
            <NavLink to="/reports/deliveries" className={linkClass} onClick={onClose}>
              <FiBarChart2 size={18} /> Delivery Report
            </NavLink>
            <NavLink to="/reports/revenue" className={linkClass} onClick={onClose}>
              <FiBarChart2 size={18} /> Revenue Report
            </NavLink>
            <NavLink to="/reports/branches" className={linkClass} onClick={onClose}>
              <FiBarChart2 size={18} /> Branch Report
            </NavLink>
          </>
        )}

        {/* Branch Staff links */}
        {role === ROLES.BRANCH_STAFF && (
          <>
            <SectionTitle>Management</SectionTitle>
            <NavLink to="/customers" className={linkClass} onClick={onClose}>
              <FiUsers size={18} /> Customers
            </NavLink>
            <NavLink to="/agents" className={linkClass} onClick={onClose}>
              <FiTruck size={18} /> Delivery Agents
            </NavLink>

            <SectionTitle>Operations</SectionTitle>
            <NavLink to="/shipments" className={linkClass} onClick={onClose}>
              <FiPackage size={18} /> Shipments
            </NavLink>
            <NavLink to="/tracking" className={linkClass} onClick={onClose}>
              <FiSearch size={18} /> Track Parcel
            </NavLink>
            <NavLink to="/transfers" className={linkClass} onClick={onClose}>
              <FiRepeat size={18} /> Transfers
            </NavLink>
            <NavLink to="/deliveries" className={linkClass} onClick={onClose}>
              <FiCheckCircle size={18} /> Deliveries
            </NavLink>

            <SectionTitle>Finance</SectionTitle>
            <NavLink to="/payments" className={linkClass} onClick={onClose}>
              <FiDollarSign size={18} /> Payments
            </NavLink>

            <SectionTitle>Reports</SectionTitle>
            <NavLink to="/reports/shipments" className={linkClass} onClick={onClose}>
              <FiBarChart2 size={18} /> Shipment Report
            </NavLink>
            <NavLink to="/reports/deliveries" className={linkClass} onClick={onClose}>
              <FiBarChart2 size={18} /> Delivery Report
            </NavLink>
          </>
        )}

        {/* Delivery Agent links */}
        {role === ROLES.DELIVERY_AGENT && (
          <>
            <NavLink to="/deliveries" className={linkClass} onClick={onClose}>
              <FiCheckCircle size={18} /> My Deliveries
            </NavLink>
            <NavLink to="/tracking" className={linkClass} onClick={onClose}>
              <FiSearch size={18} /> Track Parcel
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
