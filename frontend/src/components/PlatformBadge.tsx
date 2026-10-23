interface PlatformBadgeProps {
	platform: string;
	className?: string;
	showLabel?: boolean;
}

export function PlatformBadge({ platform, className = '', showLabel = true }: PlatformBadgeProps) {
	const badges: Record<string, { icon: string; label: string; bgColor: string; textColor: string; borderColor: string }> = {
		steam: { 
			icon: '🎮', 
			label: 'Steam', 
			bgColor: 'bg-surface',
			textColor: 'text-accent-hi-fg',
			borderColor: 'border-accent-line'
		},
	};

	const badge = badges[platform] || { 
		icon: '📝', 
		label: 'Other', 
		bgColor: 'bg-surface',
		textColor: 'text-muted',
		borderColor: 'border-line-strong'
	};

	if (!showLabel) {
		return (
			<span className={`text-lg ${className}`} title={badge.label}>
				{badge.icon}
			</span>
		);
	}

	return (
		<span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${badge.bgColor} ${badge.textColor} ${badge.borderColor} ${className}`}>
			<span>{badge.icon}</span>
			<span>{badge.label}</span>
		</span>
	);
}