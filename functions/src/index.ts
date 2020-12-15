import * as functions from 'firebase-functions';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import AuthService from './service/AuthService';
import EventRepo from './database/EventRepo';
import { errorHandler } from './middleware/ErrorHandler';
import { login, logout, issueNewAccess } from './route/Auth';
import { newEvent, getEvent } from './route/Event';
import { newUser, editUser } from './route/User';

const app = express();
app.use(cookieParser());
app.use((req, res, next) => {
  next();
}, cors({
  origin: functions.config().api.client_host,
  credentials: true,
}));

const eventRepo = new EventRepo();
const authService = new AuthService(eventRepo);

app.post('/new', newEvent(eventRepo));
app.post('/:eventUrl/new_user', newUser(eventRepo, authService));
app.post('/:eventUrl/login', login(eventRepo, authService));
app.post('/:eventUrl/logout', logout());
app.post('/:eventUrl/refresh_token', issueNewAccess(authService));
app.post('/:eventUrl/:username/edit', editUser(eventRepo));
app.get('/:eventUrl', getEvent(eventRepo, authService));

app.use(errorHandler);

export const api = functions
    .region('asia-east2')
    .https.onRequest(app);

