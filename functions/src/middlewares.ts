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

