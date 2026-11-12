import { createContext, useContext, useState, useEffect } from 'react';
import { getUserByEmail } from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('courierUser');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('courierUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await getUserByEmail(email);
      const users = res.data;
      if (users.length === 0) {
        return { success: false, message: 'User not found' };
      }
      const foundUser = users[0];
      if (foundUser.password !== password) {
        return { success: false, message: 'Invalid password' };
      }
      const userData = { ...foundUser };
      delete userData.password;
      setUser(userData);
      localStorage.setItem('courierUser', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('courierUser');
  };

  const isAdmin = () => user?.role === 'admin';
  const isBranchStaff = () => user?.role === 'branch_staff';
  const isDeliveryAgent = () => user?.role === 'delivery_agent';
  const isCustomer = () => user?.role === 'customer';
  const hasRole = (roles) => roles.includes(user?.role);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      isAdmin, isBranchStaff, isDeliveryAgent, isCustomer, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
