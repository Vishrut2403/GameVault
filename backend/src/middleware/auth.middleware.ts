import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Please set it before starting the server.');
}

export interface AuthRequest extends Request {
	user?: {
		userId: string;
		username: string;
	};
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const token = req.headers.authorization?.replace('Bearer ', '');

		if (!token) {
			res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
			return;
		}

		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
		req.user = decoded;
		next();
	} catch (error) {
		res.status(401).json({
			success: false,
			error: 'Invalid or expired token'
		});
		return;
	}
};