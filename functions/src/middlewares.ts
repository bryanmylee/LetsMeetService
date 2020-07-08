import { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

export function applyPreMiddlewares(app: Application) {
  // Expose simple interface for cookies
  app.use(cookieParser());
  // Control cross-origin resource sharing
  app.use(cors({ origin: true, credentials: true }))
}

export function applyPostMiddlewares(app: Application) {
  app.use(errorHandler);
}

interface ResponseError extends Error {
  status?: number;
}

const errorHandler = (
    err: ResponseError, req: Request,
    res: Response, next: NextFunction
) => {
  res.status(400).send({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}