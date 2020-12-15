import { Request, Response, NextFunction } from 'express';

import AuthService from '../service/AuthService';
import EventRepo from '../database/EventRepo';
import HttpError from '../model/HttpError';
import { UserSignup, UserScheduleEdit } from '../model/RequestBody';
import { setRefreshToken } from '../middleware/CookieHandler';

// Add a new user to an event.
export const newUser = (eventRepo: EventRepo, authService: AuthService) =>
    async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventUrl } = req.params;
    const { username, password, schedule } = req.body as UserSignup;

    const passwordHash = await authService.getPasswordHash(password);
    await eventRepo.insertUserOnEvent(eventUrl, username, passwordHash, schedule);

    const { accessToken, refreshToken }
        = await authService.generateAndPersistTokens(eventUrl, username);

    setRefreshToken(eventUrl, refreshToken)(req, res, next);
    res.send({ eventUrl, accessToken });
  } catch (err) {
    next(err);
  }
};

// Edit a user schedule.
export const editUser = (eventRepo: EventRepo) =>
    async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventUrl, username } = req.params;
    const { newSchedule } = req.body as UserScheduleEdit;
    const auth = AuthService.getRequestAuthPayload(req);

    if (auth.eventUrl !== eventUrl || auth.username !== username) {
      throw new HttpError(403, 'Not authorized to edit user ${username}');
    }

    await eventRepo.updateUserOnEvent(eventUrl, username, newSchedule);

    res.send({
      message: 'Updated schedule',
    });
  } catch (err) {
    next(err);
  }
};

