import * as functions from 'firebase-functions';
import express from 'express';

import { generatePasswordHash, login } from './authorization';
import { createNewEvent, getEvent, insertNewUser } from './database';
import { applyMiddlewares } from './middlewares';

const app = express();
applyMiddlewares(app);

// Create a new event.
app.post('/new', async (req, res) => {
  try {
    // Parse the request
    const { username, title, description, scheduleInMs }: {
      username: string, title: string, description: string,
      scheduleInMs: { start: number, end: number }[]
    } = req.body;
    if (scheduleInMs == null || scheduleInMs.length === 0) {
      throw new Error('scheduleInMs cannot be empty');
    }
    // Handle database logic
    const { eventUrl } = await createNewEvent(
        title, description, username, scheduleInMs);
    // Return a response
    res.send({ eventUrl });
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
    res.send({
      eventUrl,
      accessToken,
    });
  } catch (err) {
    res.status(400).send({
      error: err.message,
    });
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