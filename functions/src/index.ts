import * as functions from 'firebase-functions';
import express from 'express';

import { generatePasswordHash, comparePasswordHash, login } from './authorization';
import {
  createNewEvent,
  getEvent,
  insertNewUser,
  getUserCredentials,
  getRefreshToken,
} from './database';
import { getRefreshTokenPayload } from './tokens';
import { applyMiddlewares } from './middlewares';
import UserType from './types/UserType';

const app = express();
applyMiddlewares(app);

// Create a new event.
app.post('/new', async (req, res) => {
  try {
    // Parse the request
    const { username, password, title, description, scheduleInMs }: {
      username: string, password: string,
      title: string, description: string,
      scheduleInMs: { start: number, end: number }[]
    } = req.body;
    if (scheduleInMs == null || scheduleInMs.length === 0) {
      throw new Error('scheduleInMs cannot be empty');
    }
    const passwordHash = await generatePasswordHash(password);
    // Handle database logic
    const { eventUrl } = await createNewEvent(
        title, description, username, passwordHash, scheduleInMs);
    // Generate and store tokens.
    const accessToken = await login(res, eventUrl, username, UserType.ADMIN);
    // Return a response
    res.send({ eventUrl, accessToken });
  } catch (err) {
    res.status(400).send({
      error: err.message,
    });
  }
});

// Add a new user to an event.
app.post('/:eventUrl/new_user', async (req, res) => {
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
    const accessToken = await login(res, eventUrl, username);
    // Return a response.
    res.send({ eventUrl, accessToken });
  } catch (err) {
    res.status(400).send({
      error: err.message,
    });
  }
});

// Log a user into an event.
app.post('/:eventUrl/login', async (req, res) => {
  try {
    // Parse the request.
    const { eventUrl } = req.params;
    const { username, password }: {
      username: string, password: string,
    } = req.body;
    // Handle database logic.
    const { passwordHash, isAdmin } = await getUserCredentials(eventUrl, username);
    // Verify the request.
    const valid = await comparePasswordHash(password, passwordHash);
    if (!valid) throw new Error('Password invalid');
    // Return a response.
    const accessToken = await login(res, eventUrl, username, isAdmin ? UserType.ADMIN : UserType.DEFAULT);
    res.send({ accessToken });
  } catch (err) {
    res.status(400).send({
      error: err.message,
    });
  }
});

// Log a user out of an event.
app.post('/:eventUrl/logout', async (req, res) => {
  // Parse the request.
  const { eventUrl } = req.params;
  res.clearCookie('refreshToken', { path: `/${eventUrl}/refresh_token` });
  // Return a response.
  res.send({
    message: 'Logged out',
  });
});

// Issue new access tokens.
app.post('/:eventUrl/refresh_token', async (req, res) => {
  try {
    // Parse the request.
    const { eventUrl } = req.params;
    const { refreshToken }: { refreshToken: string } = req.cookies;
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
    const accessToken = login(res, eventUrl, username, isAdmin ? UserType.ADMIN : UserType.DEFAULT);
    res.send({ accessToken });
  } catch (err) {
    res.status(400).send({
      error: err.message,
    })
  }
});

// Get event details
app.get('/:eventUrl', async (req, res) => {
  try {
    // Parse the request
    const { eventUrl } = req.params;
    // Handle database logic
    const event = await getEvent(eventUrl);
    // Return a response
    res.send(event);
  } catch (err) {
    res.status(400).send({
      error: err.message,
    });
  }
});

export const api = functions.https.onRequest(app);