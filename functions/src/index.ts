import * as functions from 'firebase-functions';
import express from 'express';

import Interval from './types/Interval';
import { generatePasswordHash } from './authorization';
import { createNewEvent, getEvent } from './database';
import { applyMiddlewares } from './middlewares';

const app = express();
applyMiddlewares(app);

// Create a new event.
app.post('/new', async (req, res) => {
  try {
    // Parse the request
    const { username, password, title, description, eventIntervals }: {
      username: string, password: string,
      title: string, description: string,
      eventIntervals: { start: number, end: number }[]
    } = req.body;
    const parsedIntervals: Interval[] = eventIntervals.map(Interval.fromMillis);
    const passwordHash = await generatePasswordHash(password);
    console.log('passwordHash', passwordHash);
    // Handle database logic
    const { newId, eventUrl } = await createNewEvent(
        title, description, username, parsedIntervals);
    console.log('newId', newId);
    // Return a response
    res.send({ eventUrl });
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