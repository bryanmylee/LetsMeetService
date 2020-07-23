import * as functions from 'firebase-functions';
import express from 'express';

import {
  generatePasswordHash,
  comparePasswordHash,
  getAuthorizationPayload,
  generateAndPersistTokens,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from './authorization';
import {
  createNewEvent,
  getEvent,
  insertNewUser,
  updateUserIntervals,
  getUserCredentials,
  getRefreshToken,
} from './database';
import { getRefreshTokenPayload } from './tokens';
import { applyPreMiddlewares, applyPostMiddlewares } from './middlewares';
import UserType from './types/UserType';

const app = express();
applyPreMiddlewares(app);

// Create a new event.
app.post('/new', async (req, res, next) => {
  try {
    // Parse the request
    const { title, description, scheduleInMs }: {
      title: string, description: string,
      scheduleInMs: { start: number, end: number }[]
    } = req.body;
    if (scheduleInMs == null || scheduleInMs.length === 0) {
      throw new Error('scheduleInMs cannot be empty');
    }
    // Handle database logic
    const { eventUrl } = await createNewEvent(title, description, scheduleInMs);
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
      scheduleInMs: { start: number, end: number }[]
    } = req.body;
    if (scheduleInMs == null || scheduleInMs.length === 0) {
      throw new Error('scheduleInMs cannot be empty');
    }
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
    if (!valid) throw new Error('Password invalid');
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
    // Parse the request.
    const { eventUrl } = req.params;
    const { __session: refreshToken }: { __session: string } = req.cookies;
    // Verify the request.
    if (refreshToken == null) throw new Error('Refresh token not found');
    // Verify that the token is not tampered with, and retrieve the payload.
    const { username, isAdmin } = getRefreshTokenPayload(refreshToken);
    // Handle database logic.
    const storedRefreshToken = await getRefreshToken(eventUrl, username);
    if (storedRefreshToken == null) throw new Error('User invalid');
    if (storedRefreshToken !== refreshToken) {
      throw new Error('Refresh token invalid');
    }
    // Return a response.
    const userType = isAdmin ? UserType.ADMIN : UserType.DEFAULT;
    const { accessToken, refreshToken: newRefreshToken }
        = await generateAndPersistTokens(eventUrl, username, userType);
    setRefreshTokenCookie(req, res, eventUrl, newRefreshToken);
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
      newScheduleInMs: { start: number, end: number }[]
    } = req.body;
    if (newScheduleInMs == null || newScheduleInMs.length === 0) {
      throw new Error('newScheduleInMs cannot be empty');
    }
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
    // Return a response
    res.send(event);
  } catch (err) {
    next(err);
  }
});

applyPostMiddlewares(app);

export const api = functions.https.onRequest(app);