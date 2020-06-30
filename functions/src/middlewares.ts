import { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

export function applyMiddlewares(app: Application) {
  // Expose simple interface for cookies
  app.use(cookieParser());
  // Control cross-origin resource sharing
  app.use(cors({ origin: true, credentials: true }))
}