import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const hasCheckedAuthRef = useRef(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    // Only check auth once on initial mount
    if (!hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      checkAuth();
    }
    
    // Handle Steam OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('steamConnected') === 'true') {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      // Reload user data
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }, [checkAuth]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-3 border-[#333333] border-t-[#5a7fa3] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} onLoginSuccess={() => checkAuth()} />
    </Router>
  );
}

function AppRoutes({ isAuthenticated, user, onLogout, onLoginSuccess }: { isAuthenticated: boolean; user: any; onLogout: () => void; onLoginSuccess: () => void }) {
  const location = useLocation();

  // If user just logged in (token exists but isAuthenticated is still false), trigger auth check immediately
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isAuthenticated) {
      onLoginSuccess();
    }
  }, [location.pathname, isAuthenticated, onLoginSuccess]);

  return (
    <Routes>
      {isAuthenticated ? (
        <>
          <Route path="/" element={<Home user={user} onLogout={onLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;