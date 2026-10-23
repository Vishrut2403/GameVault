import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

export interface GameFilterState {
  statuses: string[];
  minRating: number | null;
  maxRating: number | null;
  maxPrice: number | null;
  tags: string[];
  searchQuery: string;
}

interface GameFiltersProps {
  filters: GameFilterState;
  onFiltersChange: (filters: GameFilterState) => void;
  availableTags: string[];
}

const STATUSES = ['playing', 'completed', 'backlog', 'unplayed'];

export const GameFilters: React.FC<GameFiltersProps> = ({
  filters,
  onFiltersChange,
  availableTags,
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
	const handleClickOutside = (event: MouseEvent) => {
	  if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
		setShowStatusDropdown(false);
	  }
	  if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
		setShowTagDropdown(false);
	  }
	};

	document.addEventListener('mousedown', handleClickOutside);
	return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const toggleStatus = (status: string) => {
	const newStatuses = filters.statuses.includes(status)
	  ? filters.statuses.filter(s => s !== status)
	  : [...filters.statuses, status];
	onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleTag = (tag: string) => {
	const newTags = filters.tags.includes(tag)
	  ? filters.tags.filter(t => t !== tag)
	  : [...filters.tags, tag];
	onFiltersChange({ ...filters, tags: newTags });
  };

  const updateRatingFilter = (type: 'min' | 'max', value: string) => {
	const numValue = value === '' ? null : Math.max(0, Math.min(5, parseInt(value) || 0));
	if (type === 'min') {
	  onFiltersChange({ ...filters, minRating: numValue });
	} else {
	  onFiltersChange({ ...filters, maxRating: numValue });
	}
  };

  const updatePriceFilter = (value: string) => {
	const numValue = value === '' ? null : Math.max(0, parseFloat(value) || 0);
	onFiltersChange({ ...filters, maxPrice: numValue });
  };

  const clearAllFilters = () => {
	onFiltersChange({
	  statuses: [],
	  minRating: null,
	  maxRating: null,
	  maxPrice: null,
	  tags: [],
	  searchQuery: '',
	});
  };

  const hasActiveFilters =
	filters.statuses.length > 0 ||
	filters.minRating !== null ||
	filters.maxRating !== null ||
	filters.maxPrice !== null ||
	filters.tags.length > 0 ||
	filters.searchQuery !== '';

  return (
	<div className="bg-surface border border-line rounded-lg p-4 space-y-4">
	  {/* Filter Row */}
	  <div className="flex flex-wrap gap-3">
		{/* Status Filter */}
		<div className="relative" ref={statusDropdownRef}>
		  <button
			onClick={() => setShowStatusDropdown(!showStatusDropdown)}
			className={`flex items-center gap-2 px-4 py-2 rounded border transition-all duration-200 ${
			  filters.statuses.length > 0
				? 'bg-accent border-accent-hi-line text-ink'
				: 'bg-raised border-line text-muted hover:bg-subtle'
			}`}
		  >
			Status {filters.statuses.length > 0 && `(${filters.statuses.length})`}
			<ChevronDown size={16} />
		  </button>
		  {showStatusDropdown && (
			<div className="absolute top-full mt-2 left-0 bg-raised border border-line rounded shadow-lg z-50 min-w-[180px]">
			  {STATUSES.map((status) => (
				<label
				  key={status}
				  className="flex items-center gap-2 px-4 py-2 hover:bg-subtle cursor-pointer transition-colors capitalize"
				>
				  <input
					type="checkbox"
					checked={filters.statuses.includes(status)}
					onChange={() => toggleStatus(status)}
					className="w-4 h-4 cursor-pointer accent-accent-line"
				  />
				  <span className="text-ink">{status}</span>
				</label>
			  ))}
			</div>
		  )}
		</div>

		{/* Tags Filter */}
		{availableTags.length > 0 && (
		  <div className="relative" ref={tagDropdownRef}>
			<button
			  onClick={() => setShowTagDropdown(!showTagDropdown)}
			  className={`flex items-center gap-2 px-4 py-2 rounded border transition-all duration-200 ${
				filters.tags.length > 0
				  ? 'bg-accent border-accent-hi-line text-ink'
				  : 'bg-raised border-line text-muted hover:bg-subtle'
			  }`}
			>
			  Tags {filters.tags.length > 0 && `(${filters.tags.length})`}
			  <ChevronDown size={16} />
			</button>
			{showTagDropdown && (
			  <div className="absolute top-full mt-2 left-0 bg-raised border border-line rounded shadow-lg z-50 min-w-[180px] max-h-[300px] overflow-y-auto">
				{availableTags.map((tag) => (
				  <label
					key={tag}
					className="flex items-center gap-2 px-4 py-2 hover:bg-subtle cursor-pointer transition-colors text-ink"
				  >
					<input
					  type="checkbox"
					  checked={filters.tags.includes(tag)}
					  onChange={() => toggleTag(tag)}
					  className="w-4 h-4 cursor-pointer accent-accent-line"
					/>
					<span className="text-ink text-sm">{tag}</span>
				  </label>
				))}
			  </div>
			)}
		  </div>
		)}

		{/* Advanced Filters Toggle */}
		<button
		  onClick={() => setShowAdvanced(!showAdvanced)}
		  className="px-4 py-2 bg-raised border border-line text-muted rounded hover:bg-subtle transition-colors"
		>
		  {showAdvanced ? '▼ Rating & Price' : '▶ Rating & Price'}
		</button>

		{/* Clear All */}
		{hasActiveFilters && (
		  <button
			onClick={clearAllFilters}
			className="px-4 py-2 bg-subtle border border-line-strong text-muted rounded hover:bg-subtle-hi transition-colors flex items-center gap-2"
		  >
			<X size={16} />
			Clear All
		  </button>
		)}
	  </div>

	  {/* Advanced Filters */}
	  {showAdvanced && (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-line">
		  {/* Min Rating */}
		  <div>
			<label className="block text-sm font-semibold text-muted mb-2">Min Rating</label>
			<select
			  value={filters.minRating ?? ''}
			  onChange={(e) => updateRatingFilter('min', e.target.value)}
			  className="w-full px-3 py-2 bg-raised rounded border border-line text-ink focus:border-accent-line outline-none transition-all"
			>
			  <option value="">Any</option>
			  {[1, 2, 3, 4, 5].map((rating) => (
				<option key={rating} value={rating}>
				  {rating}★ and above
				</option>
			  ))}
			</select>
		  </div>

		  {/* Max Rating */}
		  <div>
			<label className="block text-sm font-semibold text-muted mb-2">Max Rating</label>
			<select
			  value={filters.maxRating ?? ''}
			  onChange={(e) => updateRatingFilter('max', e.target.value)}
			  className="w-full px-3 py-2 bg-raised rounded border border-line text-ink focus:border-accent-line outline-none transition-all"
			>
			  <option value="">Any</option>
			  {[1, 2, 3, 4, 5].map((rating) => (
				<option key={rating} value={rating}>
				  {rating}★ and below
				</option>
			  ))}
			</select>
		  </div>

		  {/* Max Price */}
		  <div>
			<label className="block text-sm font-semibold text-muted mb-2">Max Price (₹)</label>
			<input
			  type="number"
			  placeholder="e.g., 500"
			  value={filters.maxPrice ?? ''}
			  onChange={(e) => updatePriceFilter(e.target.value)}
			  className="w-full px-3 py-2 bg-raised rounded border border-line text-ink placeholder-faint focus:border-accent-line outline-none transition-all"
			  min="0"
			  step="10"
			/>
		  </div>
		</div>
	  )}
	</div>
  );
};
