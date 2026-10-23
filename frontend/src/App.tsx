import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const Home = lazy(() => import('./pages/Home'));

import { API_BASE_URL as API_URL } from './services/api';
import type { User } from './types/user.types';

/** The user the stored token belongs to, or null — clearing a token the server rejects. */
async function fetchCurrentUser(): Promise<User | null> {
	const token = localStorage.getItem('token');
	if (!token) return null;

	try {
		const response = await fetch(`${API_URL}/api/auth/me`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		const data = await response.json();
		if (data.success) return data.user;
	} catch (error) {
		console.error('Auth check failed:', error);
	}

	localStorage.removeItem('token');
	localStorage.removeItem('user');
	return null;
}

function App() {
	// Without a token there is nothing to check, so start logged out instead of loading.
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => (localStorage.getItem('token') ? null : false));
	const [user, setUser] = useState<User | null>(null);
	const hasCheckedAuthRef = useRef(false);

	const checkAuth = useCallback(() => {
		fetchCurrentUser().then((current) => {
			setUser(current);
			setIsAuthenticated(current !== null);
		});
	}, []);

	useEffect(() => {
		// Only check auth once on initial mount
		if (!hasCheckedAuthRef.current) {
			hasCheckedAuthRef.current = true;
			if (localStorage.getItem('token')) checkAuth();
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
			<div className="min-h-screen bg-page flex items-center justify-center">
				<div className="relative">
					<div className="w-16 h-16 border-3 border-line border-t-accent-line rounded-full animate-spin" />
				</div>
			</div>
		);
	}

	return (
		<Router>
			<Suspense fallback={
				<div className="min-h-screen bg-page flex items-center justify-center">
					<div className="relative">
						<div className="w-16 h-16 border-3 border-line border-t-accent-line rounded-full animate-spin" />
					</div>
				</div>
			}>
				<AppRoutes isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} onLoginSuccess={() => checkAuth()} />
			</Suspense>
		</Router>
	);
}

function AppRoutes({ isAuthenticated, user, onLogout, onLoginSuccess }: { isAuthenticated: boolean; user: User | null; onLogout: () => void; onLoginSuccess: () => void }) {
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
			{isAuthenticated && user ? (
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