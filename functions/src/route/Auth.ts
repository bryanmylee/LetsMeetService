import { Request, Response, NextFunction } from 'express';

import AuthService from '../service/AuthService';
import EventRepo from '../database/EventRepo';
import HttpError from '../model/HttpError';
import { setRefreshToken, clearRefreshToken } from '../middleware/CookieHandler';

import type { UserLogin } from '../model/RequestBody';

// Log a user into an event.
export const login = (eventRepo: EventRepo, authService: AuthService) =>
    async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventUrl } = req.params;
    const { username, password } = req.body as UserLogin;

    const storedPassword = await eventRepo.getUserPasswordHash(eventUrl, username);
    const valid = await authService.comparePasswordHash(password, storedPassword);
    if (!valid) {
      throw new HttpError(401, 'Password invalid');
    }

    const { accessToken, refreshToken }
        = await authService.generateAndPersistTokens(eventUrl, username);

    setRefreshToken(eventUrl, refreshToken)(req, res, next);
    res.send({ accessToken });
  } catch (err) {
    next(err);
  }
};

// Log a user out of an event.
export const logout = () =>
    async (req: Request, res: Response, next: NextFunction) => {
  const { eventUrl } = req.params;
  clearRefreshToken(eventUrl)(req, res, next);

  res.send({
    message: 'Logged out',
  });
};

// Issue new access tokens.
export const issueNewAccess = (authService: AuthService) =>
    async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = await authService.refreshAccessToken(req, res, next);
    res.send({ accessToken });
  } catch (err) {
    next(err);
  }
};

