import * as functions from 'firebase-functions';
import express from 'express';

import Auth from './service/authorization';
import Database from './database';
import Event from './types/Event';
import UserLogin from './types/UserLogin';
import UserScheduleEdit from './types/UserScheduleEdit';
import UserSignup from './types/UserSignup';
import { applyPreMiddlewares, applyPostMiddlewares } from './middlewares';

const app = express();
applyPreMiddlewares(app);

// Create a new event.
app.post('/new', async (req, res, next) => {
  try {
    // Parse the request
    const { title, description, color, scheduleInMs } = req.body as Event;
    if (scheduleInMs == null || scheduleInMs.length === 0) {
      throw new Error('scheduleInMs cannot be empty');
    }
    // Handle database logic
    const { eventUrl } = await Database.createNewEvent(title, description, color, scheduleInMs);
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
    const { username, password, scheduleInMs } = req.body as UserSignup;
    const passwordHash = await Auth.generatePasswordHash(password);
    // Handle database logic.
    await Database.insertNewUser(eventUrl, username, passwordHash, scheduleInMs);
    // Generate and store tokens.
    const { accessToken, refreshToken }
        = await Auth.generateAndPersistTokens(eventUrl, username);
    Auth.setRefreshTokenCookie(req, res, eventUrl, refreshToken);
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
    const { passwordHash }
        = await Database.getUserCredentials(eventUrl, username);
    // Verify the request.
    const valid = await Auth.comparePasswordHash(password, passwordHash);
    if (!valid) {
      throw new Error('Password invalid');
    }
    // Return a response.
    const { accessToken, refreshToken }
        = await Auth.generateAndPersistTokens(eventUrl, username);
    Auth.setRefreshTokenCookie(req, res, eventUrl, refreshToken);
    res.send({ accessToken });
  } catch (err) {
    next(err);
  }
});

// Log a user out of an event.
app.post('/:eventUrl/logout', async (req, res) => {
  // Parse the request.
  const { eventUrl } = req.params;
  Auth.clearRefreshTokenCookie(req, res, eventUrl);
  // Return a response.
  res.send({
    message: 'Logged out',
  });
});

// Issue new access tokens.
app.post('/:eventUrl/refresh_token', async (req, res, next) => {
  try {
    const accessToken = await Auth.refreshAccessToken(req, res);
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
    const payload = Auth.getRequestAuthPayload(req);
    const { newScheduleInMs } = req.body as UserScheduleEdit;
    // Verify the request.
    if (payload.eventUrl !== eventUrl || payload.username !== username) {
      throw new Error('Not authorized');
    }
    // Handle database logic.
    await Database.updateUserIntervals(eventUrl, username, newScheduleInMs);
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
    const event = await Database.getEvent(eventUrl);
    let accessToken = null;
    try {
      accessToken = await Auth.refreshAccessToken(req, res);
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
