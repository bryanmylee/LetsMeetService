import * as functions from 'firebase-functions';
import express from 'express';

import AuthService from './service/AuthService';
import Event from './model/Event';
import EventRepo from './database/EventRepo';
import HttpError from './model/HttpError';
import { UserSignup, UserLogin, UserScheduleEdit } from './model/RequestBody';
import { applyPreMiddlewares } from './middlewares';
import { setRefreshToken, clearRefreshToken } from './middlewares/CookieMiddleware';
import { errorHandler } from './middlewares/ErrorMiddleware';

const app = express();
applyPreMiddlewares(app);

const eventRepo = new EventRepo();
const authService = new AuthService(eventRepo);

// Create a new event.
app.post('/new', async (req, res, next) => {
  try {
    // Parse the request
    const { title, description, color, schedule } = req.body as Event;
    if (schedule == null || schedule.length === 0) {
      throw new HttpError(400, 'Property \'schedule\' cannot be empty');
    }
    // Handle database logic
    const { eventUrl } = await eventRepo.insert(title, description, color, schedule);
    // Return a response
    res.send({ eventUrl });
  } catch (err) {
    next(err);
  }
});

// Add a new user to an event.
app.post('/:eventUrl/new_user', async (req, res, next) => {
  try {
    // Parse the request.
    const { eventUrl } = req.params;
    const { username, password, schedule } = req.body as UserSignup;
    const passwordHash = await AuthService.getPasswordHash(password);
    // Handle database logic.
    await eventRepo.insertUserOnEvent(eventUrl, username, passwordHash, schedule);
    // Generate and store tokens.
    const { accessToken, refreshToken }
        = await authService.generateAndPersistTokens(eventUrl, username);
    setRefreshToken(eventUrl, refreshToken)(req, res, next);
    // Return a response.
    res.send({ eventUrl, accessToken });
  } catch (err) {
    next(err);
  }
});

// Log a user into an event.
app.post('/:eventUrl/login', async (req, res, next) => {
  try {
    // Parse the request.
    const { eventUrl } = req.params;
    const { username, password } = req.body as UserLogin;
    // Handle database logic.
    const passwordHash = await eventRepo.getUserPasswordHash(eventUrl, username);
    // Verify the request.
    const valid = await AuthService.comparePasswordHash(password, passwordHash);
    if (!valid) {
      throw new HttpError(401, 'Password invalid');
    }
    // Return a response.
    const { accessToken, refreshToken }
        = await authService.generateAndPersistTokens(eventUrl, username);
    setRefreshToken(eventUrl, refreshToken)(req, res, next);
    res.send({ accessToken });
  } catch (err) {
    next(err);
  }
});

// Log a user out of an event.
app.post('/:eventUrl/logout', async (req, res, next) => {
  // Parse the request.
  const { eventUrl } = req.params;
  clearRefreshToken(eventUrl)(req, res, next);
  // Return a response.
  res.send({
    message: 'Logged out',
  });
});

// Issue new access tokens.
app.post('/:eventUrl/refresh_token', async (req, res, next) => {
  try {
    const accessToken = await authService.refreshAccessToken(req, res)
    res.send({ accessToken });
  } catch (err) {
    next(err);
  }
});

// Edit a user schedule.
app.post('/:eventUrl/:username/edit', async (req, res, next) => {
  try {
    // Parse the request.
    const { eventUrl, username } = req.params;
    const payload = AuthService.getRequestAuthPayload(req);
    const { newSchedule } = req.body as UserScheduleEdit;
    // Verify the request.
    if (payload.eventUrl !== eventUrl || payload.username !== username) {
      throw new HttpError(401, 'Not authorized');
    }
    // Handle database logic.
    await eventRepo.updateUserOnEvent(eventUrl, username, newSchedule);
    // Return a response.
    res.send({
      message: 'Updated schedule',
    });
  } catch (err) {
    next(err);
  }
});

// Get event details
app.get('/:eventUrl', async (req, res, next) => {
  try {
    // Parse the request
    const { eventUrl } = req.params;
    // Handle database logic
    const event = await eventRepo.get(eventUrl);
    let accessToken = null;
    try {
      accessToken = await authService.refreshAccessToken(req, res);
    } catch {}
    // Return a response
    res.send({
      ...event,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

export const api = functions
    .region('asia-east2')
    .https.onRequest(app);

