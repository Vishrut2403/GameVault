import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { hltbBySteamAppId, hltbByName, type HltbTimes } from '../services/hltb.service';

const router = Router();
router.use(authMiddleware);

async function respond(res: Response, label: string, lookup: () => Promise<HltbTimes | null>) {
	try {
		const data = await lookup();
		if (data) return res.json({ success: true, data });
		return res.json({ success: false, error: 'No HLTB data found', data: null });
	} catch (err: any) {
		console.error(`[HLTB] ${label} lookup error:`, err.message);
		return res.status(500).json({ success: false, error: 'HLTB lookup failed', data: null });
	}
}

router.get('/steam/:appId', (req: AuthRequest, res: Response) => {
	const appId = Array.isArray(req.params.appId) ? req.params.appId[0] : req.params.appId;
	return respond(res, 'steam', () => hltbBySteamAppId(appId));
});

router.get('/name/:gameName', (req: AuthRequest, res: Response) => {
	const gameName = Array.isArray(req.params.gameName) ? req.params.gameName[0] : req.params.gameName;
	return respond(res, 'name', () => hltbByName(gameName));
});

export default router;
