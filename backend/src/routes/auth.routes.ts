import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        error: 'Email, username, and password are required'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: existingUser.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName: username,
        password: hashedPassword,
        xp: 0,
        level: 1
      }
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        steamLinked: !!user.steamId,
        raLinked: !!user.raUsername
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      res.status(400).json({
        success: false,
        error: 'Email/username and password are required'
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        steamLinked: !!user.steamId,
        raLinked: !!user.raUsername,
        steamUsername: user.steamUsername,
        steamId: user.steamId,
        raUsername: user.raUsername,
        enablePCSX2:     user.enablePCSX2,
        enableRPCS3:     user.enableRPCS3,
        enablePPSSPP:    user.enablePPSSPP,
        enableRetroArch: user.enableRetroArch,
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        steamLinked: !!user.steamId,
        raLinked: !!user.raUsername,
        steamUsername: user.steamUsername,
        steamId: user.steamId,
        raUsername: user.raUsername,
        enablePCSX2:     user.enablePCSX2,
        enableRPCS3:     user.enableRPCS3,
        enablePPSSPP:    user.enablePPSSPP,
        enableRetroArch: user.enableRetroArch,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Auth verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Steam OAuth - Store userId in session/cookie
router.get('/steam', (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  if (!userId) {
    res.status(400).send('Missing userId parameter');
    return;
  }

  const returnUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/steam/callback?userId=${userId}`;
  const steamLoginUrl = `https://steamcommunity.com/openid/login?${new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': process.env.BACKEND_URL || 'http://localhost:3001',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  })}`;

  res.redirect(steamLoginUrl);
});

// Steam OAuth callback - Save Steam ID to user
router.get('/steam/callback', async (req: Request, res: Response) => {
  try {
    const claimedId = req.query['openid.claimed_id'] as string;
    const userId = req.query.userId as string;
    const steamId = claimedId?.split('/').pop();

    if (!steamId || !userId) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=steam_auth_failed`);
      return;
    }

    // Fetch Steam username from Steam API
    let steamUsername = null;
    const steamApiKey = process.env.STEAM_API_KEY;
    if (steamApiKey) {
      const response = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
      );
      const data: any = await response.json();
      if (data.response?.players?.[0]) {
        steamUsername = data.response.players[0].personaname;
      }
    }

    // Update user with Steam ID
    await prisma.user.update({
      where: { id: userId },
      data: {
        steamId,
        steamUsername: steamUsername || `Steam User ${steamId.slice(-4)}`,
        steamLinkedAt: new Date()
      }
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?steamConnected=true`);
  } catch (error) {
    console.error('Steam auth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=steam_auth_failed`);
  }
});

export default router;