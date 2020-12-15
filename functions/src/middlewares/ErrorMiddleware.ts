import '../model/HttpError';
import { Request, Response, NextFunction } from 'express';
import HttpError from '../model/HttpError';

export const errorHandler = (
    err: HttpError, req: Request,
    res: Response, next: NextFunction) => {
  res.status(err.status ?? 200).send({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}

