import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// MOCK USERS for development (must match frontend authStore.ts)
const MOCK_USERS = [
  { id: '1', email: 'admin@garage.com', role: 'admin' },
  { id: '2', email: 'mechanic@garage.com', role: 'mechanic' },
  { id: '3', email: 'cashier@garage.com', role: 'cashier' },
  { id: '4', email: 'supervisor@garage.com', role: 'supervisor' }
];

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Try to decode the token (expecting format similar to mock token)
    try {
      // Frontend generates: btoa(`${user.id}-${Date.now()}-${Math.random()}`)
      const decoded = Buffer.from(token, 'base64').toString('ascii');
      const parts = decoded.split('-');
      
      if (parts.length >= 1) {
        const userId = parts[0];
        
        // 1. Check Mock Users
        const mockUser = MOCK_USERS.find(u => u.id === userId);
        if (mockUser) {
          req.user = mockUser;
          return next();
        }

      }
    } catch (e) {
      console.error('Token decoding error:', e);
    }

    // If we reach here, authentication failed
    return res.status(401).json({ error: 'Invalid token or user not found' });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
