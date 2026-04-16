import rateLimit from 'express-rate-limit';

// Disable rate limiting in development
const isDevelopment = process.env.NODE_ENV !== 'production';

// No-op limiter for development
const noOpLimiter = (req: any, res: any, next: any) => next();

//General API rate limiter
//1000 requests per 15 minutes per IP (development friendly)
export const apiLimiter = isDevelopment ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health';
  }
});

//Stricter limiter for authentication endpoints
//100 attempts per 15 minutes in development (prevent brute force in production)
export const authLimiter = isDevelopment ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});


//Moderate limiter for expensive operations
//500 requests per 15 minutes in development (sync, recommendations, etc)
export const expensiveOpLimiter = isDevelopment ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});


// Lenient limiter for general endpoints
// 1000 requests per 15 minutes in development
export const lenientLimiter = isDevelopment ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
