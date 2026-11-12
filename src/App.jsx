import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Dashboards
import AdminDashboard from './pages/dashboard/AdminDashboard';
import BranchStaffDashboard from './pages/dashboard/BranchStaffDashboard';
import DeliveryAgentDashboard from './pages/dashboard/DeliveryAgentDashboard';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';

// Customers
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerDetail from './pages/customers/CustomerDetail';

// Branches
import BranchList from './pages/branches/BranchList';
import BranchForm from './pages/branches/BranchForm';
import BranchDetail from './pages/branches/BranchDetail';

// Agents
import AgentList from './pages/agents/AgentList';
import AgentForm from './pages/agents/AgentForm';
import AgentDetail from './pages/agents/AgentDetail';

// Shipments
import ShipmentList from './pages/shipments/ShipmentList';
import ShipmentForm from './pages/shipments/ShipmentForm';
import ShipmentDetail from './pages/shipments/ShipmentDetail';

// Tracking
import TrackParcel from './pages/tracking/TrackParcel';

// Transfers
import TransferList from './pages/transfers/TransferList';
import TransferForm from './pages/transfers/TransferForm';

// Delivery
import DeliveryList from './pages/delivery/DeliveryList';
import DeliveryConfirmation from './pages/delivery/DeliveryConfirmation';

// Payments
import PaymentList from './pages/payments/PaymentList';
import PaymentForm from './pages/payments/PaymentForm';

// Pricing
import PricingList from './pages/pricing/PricingList';
import PricingForm from './pages/pricing/PricingForm';

// Reports
import ShipmentReport from './pages/reports/ShipmentReport';
import DeliveryReport from './pages/reports/DeliveryReport';
import RevenueReport from './pages/reports/RevenueReport';
import BranchReport from './pages/reports/BranchReport';

const DashboardRouter = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case 'admin': return <AdminDashboard />;
    case 'branch_staff': return <BranchStaffDashboard />;
    case 'delivery_agent': return <DeliveryAgentDashboard />;
    case 'customer': return <CustomerDashboard />;
    default: return <Navigate to="/login" />;
  }
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<TrackParcel />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardRouter />} />
          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Customers - Admin & Branch Staff */}
          <Route path="/customers" element={<ProtectedRoute roles={['admin', 'branch_staff']}><CustomerList /></ProtectedRoute>} />
          <Route path="/customers/new" element={<ProtectedRoute roles={['admin', 'branch_staff']}><CustomerForm /></ProtectedRoute>} />
          <Route path="/customers/edit/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><CustomerForm /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><CustomerDetail /></ProtectedRoute>} />

          {/* Branches - Admin */}
          <Route path="/branches" element={<ProtectedRoute roles={['admin']}><BranchList /></ProtectedRoute>} />
          <Route path="/branches/new" element={<ProtectedRoute roles={['admin']}><BranchForm /></ProtectedRoute>} />
          <Route path="/branches/edit/:id" element={<ProtectedRoute roles={['admin']}><BranchForm /></ProtectedRoute>} />
          <Route path="/branches/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><BranchDetail /></ProtectedRoute>} />

          {/* Agents - Admin & Branch Staff */}
          <Route path="/agents" element={<ProtectedRoute roles={['admin', 'branch_staff']}><AgentList /></ProtectedRoute>} />
          <Route path="/agents/new" element={<ProtectedRoute roles={['admin', 'branch_staff']}><AgentForm /></ProtectedRoute>} />
          <Route path="/agents/edit/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><AgentForm /></ProtectedRoute>} />
          <Route path="/agents/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><AgentDetail /></ProtectedRoute>} />

          {/* Shipments - All roles */}
          <Route path="/shipments" element={<ShipmentList />} />
          <Route path="/shipments/new" element={<ProtectedRoute roles={['admin', 'branch_staff', 'customer']}><ShipmentForm /></ProtectedRoute>} />
          <Route path="/shipments/edit/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><ShipmentForm /></ProtectedRoute>} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />

          {/* Tracking */}
          <Route path="/tracking" element={<TrackParcel />} />

          {/* Transfers - Admin & Branch Staff */}
          <Route path="/transfers" element={<ProtectedRoute roles={['admin', 'branch_staff']}><TransferList /></ProtectedRoute>} />
          <Route path="/transfers/new" element={<ProtectedRoute roles={['admin', 'branch_staff']}><TransferForm /></ProtectedRoute>} />

          {/* Delivery - Admin, Branch Staff & Delivery Agent */}
          <Route path="/deliveries" element={<ProtectedRoute roles={['admin', 'branch_staff', 'delivery_agent']}><DeliveryList /></ProtectedRoute>} />
          <Route path="/deliveries/confirm/:id" element={<ProtectedRoute roles={['delivery_agent', 'branch_staff']}><DeliveryConfirmation /></ProtectedRoute>} />

          {/* Payments - Admin & Branch Staff */}
          <Route path="/payments" element={<ProtectedRoute roles={['admin', 'branch_staff', 'customer']}><PaymentList /></ProtectedRoute>} />
          <Route path="/payments/new" element={<ProtectedRoute roles={['admin', 'branch_staff']}><PaymentForm /></ProtectedRoute>} />
          <Route path="/payments/edit/:id" element={<ProtectedRoute roles={['admin', 'branch_staff']}><PaymentForm /></ProtectedRoute>} />

          {/* Pricing - Admin */}
          <Route path="/pricing" element={<ProtectedRoute roles={['admin']}><PricingList /></ProtectedRoute>} />
          <Route path="/pricing/new" element={<ProtectedRoute roles={['admin']}><PricingForm /></ProtectedRoute>} />
          <Route path="/pricing/edit/:id" element={<ProtectedRoute roles={['admin']}><PricingForm /></ProtectedRoute>} />

          {/* Reports - Admin & Branch Staff */}
          <Route path="/reports/shipments" element={<ProtectedRoute roles={['admin', 'branch_staff']}><ShipmentReport /></ProtectedRoute>} />
          <Route path="/reports/deliveries" element={<ProtectedRoute roles={['admin', 'branch_staff']}><DeliveryReport /></ProtectedRoute>} />
          <Route path="/reports/revenue" element={<ProtectedRoute roles={['admin']}><RevenueReport /></ProtectedRoute>} />
          <Route path="/reports/branches" element={<ProtectedRoute roles={['admin']}><BranchReport /></ProtectedRoute>} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
