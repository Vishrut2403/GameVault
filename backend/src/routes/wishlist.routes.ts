import { Router, Request, Response } from 'express';
import wishlistService from '../services/wishlist.service';
import recommendationService from '../services/recommendation.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const wishlist = await wishlistService.getUserWishlist(userId);
    
    res.json({
      success: true,
      count: wishlist.length,
      data: wishlist
    });
  } catch (error: any) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch wishlist'
    });
  }
});

// Support BOTH /api/wishlist and /api/wishlist/item for adding
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { appId, name, tags, listPrice, currentPrice, imageUrl } = req.body;

    if (!appId || !name) {
      res.status(400).json({
        success: false,
        error: 'appId and name are required'
      });
      return;
    }

    const item = await wishlistService.createWishlistItem(userId, {
      appId,
      name,
      tags: tags || [],
      listPrice: listPrice || 0,
      currentPrice: currentPrice || 0,
      imageUrl
    });

    res.json({
      success: true,
      data: item
    });
  } catch (error: any) {
    console.error('Error adding wishlist item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add wishlist item'
    });
  }
});

router.post('/item', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { appId, name, tags, listPrice, currentPrice, imageUrl } = req.body;

    if (!appId || !name) {
      res.status(400).json({
        success: false,
        error: 'appId and name are required'
      });
      return;
    }

    const item = await wishlistService.createWishlistItem(userId, {
      appId,
      name,
      tags: tags || [],
      listPrice: listPrice || 0,
      currentPrice: currentPrice || 0,
      imageUrl
    });

    res.json({
      success: true,
      data: item
    });
  } catch (error: any) {
    console.error('Error adding wishlist item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add wishlist item'
    });
  }
});

router.patch('/item/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, tags, listPrice, currentPrice, imageUrl } = req.body;

    const item = await wishlistService.updateWishlistItem(id, userId, {
      name,
      tags,
      listPrice,
      currentPrice,
      imageUrl
    });

    res.json({
      success: true,
      data: item
    });
  } catch (error: any) {
    console.error('Error updating wishlist item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update wishlist item'
    });
  }
});

router.delete('/item/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const result = await wishlistService.deleteWishlistItem(id, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error deleting wishlist item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete wishlist item'
    });
  }
});

router.get('/item/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const item = await wishlistService.getWishlistItem(id, userId);

    res.json({
      success: true,
      data: item
    });
  } catch (error: any) {
    console.error('Error fetching wishlist item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch wishlist item'
    });
  }
});

router.get('/recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const recommendations = await recommendationService.getRecommendations(userId);

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate recommendations'
    });
  }
});

export default router;