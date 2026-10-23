import React from 'react';
import type { SortField, SortDirection } from '../types/games.types';

interface SortButtonProps {
	field: SortField;
	label: string;
	currentField: SortField;
	currentDirection: SortDirection;
	onSort: (field: SortField) => void;
}

export const SortButton: React.FC<SortButtonProps> = ({
	field,
	label,
	currentField,
	currentDirection,
	onSort
}) => {
	const isActive = currentField === field;

	return (
		<button
			onClick={() => onSort(field)}
			className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
				isActive
					? 'bg-accent border border-accent-line text-ink'
					: 'bg-surface border border-line text-muted hover:bg-raised hover:text-ink hover:border-accent-line'
			}`}
		>
			<span>{label}</span>
			{isActive && (
				<span className="text-ink font-bold text-xs">
					{currentDirection === 'asc' ? '↑' : '↓'}
				</span>
			)}
		</button>
	);
};