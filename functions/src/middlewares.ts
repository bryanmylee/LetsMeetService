import * as functions from 'firebase-functions';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Application, Request, Response, NextFunction } from 'express';

export function applyPreMiddlewares(app: Application) {
  // Expose simple interface for cookies
  app.use(cookieParser());
  // Control cross-origin resource sharing
  app.use((req: Request, res: Response, next: NextFunction) => {
    next();
  }, cors({
    origin: functions.config().api.client_host,
    credentials: true,
  }));
}

export function applyPostMiddlewares(app: Application) {
  app.use(errorHandler);
}

interface ResponseError extends Error {
  status?: number;
}

const errorHandler = (
    err: ResponseError, req: Request,
    res: Response, next: NextFunction) => {
  res.send({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}

