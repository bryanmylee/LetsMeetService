import * as functions from 'firebase-functions';
import express from 'express';

import {
  generatePasswordHash,
  comparePasswordHash,
  getAuthorizationPayload,
  generateAndPersistTokens,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getNewAccessToken,
} from './authorization';
import {
  createNewEvent,
  getEvent,
  insertNewUser,
  updateUserIntervals,
  getUserCredentials,
} from './database';
import { applyPreMiddlewares, applyPostMiddlewares } from './middlewares';
import UserType from './types/UserType';
import Interval from './types/Interval';

const app = express();
applyPreMiddlewares(app);

// Create a new event.
app.post('/new', async (req, res, next) => {
  try {
    // Parse the request
    const { title, description, color, scheduleInMs }: {
      title: string, description: string, color: string,
      scheduleInMs: Interval[]
    } = req.body;
    if (scheduleInMs == null || scheduleInMs.length === 0) {
      throw new Error('scheduleInMs cannot be empty');
    }
    // Handle database logic
    const { eventUrl } = await createNewEvent(title, description, color, scheduleInMs);
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
    const { username, password, scheduleInMs }: {
      username: string, password: string,
      scheduleInMs: Interval[]
    } = req.body;
    const passwordHash = await generatePasswordHash(password);
    // Handle database logic.
    await insertNewUser(eventUrl, username, passwordHash, scheduleInMs);
    // Generate and store tokens.
    const { accessToken, refreshToken }
        = await generateAndPersistTokens(eventUrl, username);
    setRefreshTokenCookie(req, res, eventUrl, refreshToken);
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
    const { username, password }: {
      username: string, password: string,
    } = req.body;
    // Handle database logic.
    const { passwordHash, isAdmin }
        = await getUserCredentials(eventUrl, username);
    // Verify the request.
    const valid = await comparePasswordHash(password, passwordHash);
    if (!valid) {
      throw new Error('Password invalid');
    }
    // Return a response.
    const userType = isAdmin ? UserType.ADMIN : UserType.DEFAULT;
    const { accessToken, refreshToken }
        = await generateAndPersistTokens(eventUrl, username, userType);
    setRefreshTokenCookie(req, res, eventUrl, refreshToken);
    res.send({ accessToken });
  } catch (err) {
    next(err);
  }
});

// Log a user out of an event.
app.post('/:eventUrl/logout', async (req, res) => {
  // Parse the request.
  const { eventUrl } = req.params;
  clearRefreshTokenCookie(req, res, eventUrl);
  // Return a response.
  res.send({
    message: 'Logged out',
  });
});

// Issue new access tokens.
app.post('/:eventUrl/refresh_token', async (req, res, next) => {
  try {
    const accessToken = getNewAccessToken(req, res);
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
    const payload = getAuthorizationPayload(req);
    const { newScheduleInMs }: {
      newScheduleInMs: Interval[]
    } = req.body;
    // Verify the request.
    if (payload.eventUrl !== eventUrl || payload.username !== username) {
      throw new Error('Not authorized');
    }
    // Handle database logic.
    await updateUserIntervals(eventUrl, username, newScheduleInMs);
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
    const event = await getEvent(eventUrl);
    let accessToken = null;
    try {
      accessToken = await getNewAccessToken(req, res);
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

applyPostMiddlewares(app);

export const api = functions
    .region('asia-east2')
    .https.onRequest(app);
