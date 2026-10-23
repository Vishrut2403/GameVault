// The signed-in user, as returned by GET /api/auth/me.
export interface User {
	id: string;
	email: string;
	username: string;
	displayName: string | null;
	avatar: string | null;
	xp: number;
	level: number;
	steamLinked: boolean;
	steamId: string | null;
	steamUsername: string | null;
	steamLinkedAt?: string | null;
	createdAt: string;
}
