import axios from 'axios';

// In production Express serves this bundle from the same origin as the API, so
// an empty base yields same-origin relative URLs ("/api/..."). That keeps the
// deploy working even if VITE_API_URL is unset, and survives a hostname change
// without a rebuild. Only the dev server, on a different port, needs a host.
export const API_BASE_URL =
	import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

const api = axios.create({
	baseURL: `${API_BASE_URL}/api`,
	timeout: 30000,
	headers: {
		'Content-Type': 'application/json',
	},
});

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

api.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem('token');
			window.location.href = '/';
		}
		return Promise.reject(error);
	}
);

export default api;