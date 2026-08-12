import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL as API_URL } from '../services/api';

function AuthPage() {
	const [isLogin, setIsLogin] = useState(true);
	const [formData, setFormData] = useState({
		email: '',
		username: '',
		password: '',
		confirmPassword: ''
	});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!isLogin && formData.password !== formData.confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (formData.password.length < 6) {
			setError('Password must be at least 6 characters');
			return;
		}

		setLoading(true);

		try {
			const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
			const body = isLogin
				? {
						emailOrUsername: formData.email || formData.username,
						password: formData.password
					}
				: {
						email: formData.email,
						username: formData.username,
						password: formData.password
					};

			const response = await fetch(`${API_URL}${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Authentication failed');
				return;
			}

			localStorage.setItem('token', data.token);
			localStorage.setItem('user', JSON.stringify(data.user));
			navigate('/');
		} catch (err) {
			setError('An error occurred. Please try again.');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="bg-[#1a1a1a] rounded-lg border border-[#333333] p-8 shadow-lg">
					<h1 className="text-3xl font-bold text-[#e5e5e5] mb-2 text-center">Game Vault</h1>
					<p className="text-center text-[#a0a0a0] mb-8">
						{isLogin ? 'Sign in to your account' : 'Create a new account'}
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						{!isLogin && (
							<div>
								<label className="block text-sm font-medium text-[#a0a0a0] mb-2">Email</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] focus:outline-none"
									placeholder="you@example.com"
									required={!isLogin}
								/>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-[#a0a0a0] mb-2">
								{isLogin ? 'Email or Username' : 'Username'}
							</label>
							<input
								type="text"
								value={isLogin ? formData.email : formData.username}
								onChange={(e) =>
									setFormData({
										...formData,
										[isLogin ? 'email' : 'username']: e.target.value
									})
								}
								className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] focus:outline-none"
								placeholder={isLogin ? 'Email or username' : 'vishydaperry'}
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-[#a0a0a0] mb-2">Password</label>
							<input
								type="password"
								value={formData.password}
								onChange={(e) => setFormData({ ...formData, password: e.target.value })}
								className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] focus:outline-none"
								placeholder="••••••••"
								required
							/>
						</div>

						{!isLogin && (
							<div>
								<label className="block text-sm font-medium text-[#a0a0a0] mb-2">Confirm Password</label>
								<input
									type="password"
									value={formData.confirmPassword}
									onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
									className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded text-[#e5e5e5] placeholder-[#696969] focus:border-[#5a7fa3] focus:outline-none"
									placeholder="••••••••"
									required={!isLogin}
								/>
							</div>
						)}

						{error && (
							<div className="p-3 bg-[#4a3a3a] border border-[#5a4a4a] rounded text-[#a0a0a0] text-sm">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 bg-[#5a7fa3] text-[#e5e5e5] rounded font-semibold hover:bg-[#7a9fc3] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-[#a0a0a0] text-sm">
							{isLogin ? "Don't have an account?" : 'Already have an account?'}
							<button
								onClick={() => setIsLogin(!isLogin)}
								className="ml-2 text-[#5a7fa3] hover:text-[#7a9fc3] font-semibold transition-colors"
							>
								{isLogin ? 'Sign Up' : 'Sign In'}
							</button>
						</p>
					</div>
				</div>

				<p className="text-center text-[#696969] text-xs mt-6">
					GameVault © 2026 • Minimalist Edition
				</p>
			</div>
		</div>
	);
}

export default AuthPage;