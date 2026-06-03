// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

// Placeholder for Doctor
const Placeholder = ({ title }) => <div className="p-10 text-2xl font-bold text-slate-800">{title}</div>;

// --- THE BOUNCER (Protected Route Wrapper) ---
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">Loading...</div>;
  
  // If no user is logged in, kick them to login
  if (!user) return <Navigate to="/login" replace />;
  
  // (Optional) If you want to strictly enforce roles, you can uncomment this:
  // if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <Router>
      {/* AuthProvider MUST be inside Router now so it can navigate during logout */}
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 text-slate-800">
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Role-Based Dashboards */}
            <Route 
              path="/patient" 
              element={
                <ProtectedRoute allowedRole="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/doctor" 
              element={
                <ProtectedRoute allowedRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;