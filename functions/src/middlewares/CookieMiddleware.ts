import { Response, Request, NextFunction } from 'express';

/**
 * Create a middleware function to set a refresh token for a given event.
 * @param eventUrl     The url identifier of the event to set the token for.
 * @param refreshToken The refresh JWT.
 */
export const setRefreshToken = (eventUrl: string, refreshToken: string) =>
    (req: Request, res: Response, next: NextFunction) => {
  res.cookie('__session', refreshToken, {
    httpOnly: true,
    path: getBasePath(req.originalUrl, eventUrl),
  });
  next();
}

/**
 * Clear the refresh token cookie for an event.
 * @param req The request sent from the client.
 * @param res The response to send to the client.
 * @param eventUrl The url identifier of the event this token is for.
 */
export const clearRefreshToken = (eventUrl: string) =>
    (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie('__session', {
    path: getBasePath(req.originalUrl, eventUrl),
  });
  next();
}

/**
 * Get the base path of the current API endpoint.
 * The path of the cookie has to match the refresh endpoint.
 * @param originalUrl The original url of the request.
 * @param eventUrl    The url identifier of the event this token is for.
 * @returns The base path, ending with the eventUrl.
 */
const getBasePath = (originalUrl: string, eventUrl: string) => {
  // TODO Figure out how this works...
  // Since eventUrl is consistently at the end of the path, we can use that to
  // find the current path.
  const tokens = originalUrl.split(eventUrl);
  // Use the second last token, as it is possible to have an endpoint path that
  // could contain the eventUrl. We want the last instance of eventUrl.
  return tokens[tokens.length - 2] + eventUrl;
}

