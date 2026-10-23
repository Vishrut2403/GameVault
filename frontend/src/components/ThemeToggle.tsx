import { useState } from 'react';

/** Switches between the dark and neo-brutalist themes and remembers the choice. */
export function ThemeToggle({ className }: { className: string }) {
	const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');

	const toggle = () => {
		const next = theme === 'dark' ? 'brutal' : 'dark';
		document.documentElement.dataset.theme = next;
		try { localStorage.setItem('theme', next); } catch { /* private mode: theme lasts this visit only */ }
		setTheme(next);
	};

	return (
		<button onClick={toggle} aria-pressed={theme === 'brutal'} className={className}>
			{theme === 'dark' ? 'Brutal theme' : 'Dark theme'}
		</button>
	);
}
