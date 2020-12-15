import { Request, Response, NextFunction } from 'express';

import Event from '../model/Event';
import HttpError from '../model/HttpError';
import EventRepo from '../database/EventRepo';
import AuthService from '../service/AuthService';

// Create a new event.
export const newEvent = (eventRepo: EventRepo) =>
    async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, color, schedule } = req.body as Event;

    if (schedule == null || schedule.length === 0) {
      throw new HttpError(400, 'Property \'schedule\' cannot be empty');
    }

    const { eventUrl } = await eventRepo.insert(title, description, color, schedule);

    res.send({ eventUrl });
  } catch (err) {
    next(err);
  }
};

// Get event details
export const getEvent = (eventRepo: EventRepo, authService: AuthService) =>
    async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventUrl } = req.params;

    const event = await eventRepo.get(eventUrl);
    let accessToken: string | undefined;
    try {
      accessToken = await authService.refreshAccessToken(req, res);
    } catch {}

    res.send({
      ...event,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

