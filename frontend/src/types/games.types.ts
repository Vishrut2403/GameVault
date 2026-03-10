export interface LibraryGame {
  id: string;
  platform: string;
  platformGameId: string;
  appId?: string;
  name: string;
  playtimeForever: number;
  pricePaid: number | null;
  pricePerHour: number | null;
  status: string | null;
  rating: number | null;
  tier: string | null;
  review: string | null;
  imgIconUrl: string | null;
  headerImage: string | null;
  totalAchievements: number | null;
  completedAchievements: number | null;
  achievementPercentage: number | null;
  userTags: string[];
  genres: string[];
  userId: string;
  platformData?: any;
}

export type TabType = 'journal' | 'dashboard' | 'wishlist' | 'recommendations' | 'analytics' | 'tierlist';
export type SortField = 'name' | 'playtime' | 'pricePaid' | 'pricePerHour' | 'rating' | 'status';
export type SortDirection = 'asc' | 'desc';