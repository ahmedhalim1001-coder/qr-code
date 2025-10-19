
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';
import DevicesPage from './pages/DevicesPage';
import ScanPage from './pages/ScanPage';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
};

const Main: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
                path="/*"
                element={
                    isAuthenticated ? (
                        <Layout>
                            <Routes>
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/scan" element={<ScanPage />} />
                                <Route path="/companies" element={<CompaniesPage />} />
                                <Route path="/users" element={<UsersPage />} />
                                <Route path="/devices" element={<DevicesPage />} />
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </Layout>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />
        </Routes>
    );
};

export default App;
