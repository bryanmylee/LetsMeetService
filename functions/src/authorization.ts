import { Response, Request } from 'express';
import bcrypt from 'bcryptjs';

import {
  getAccessTokenPayload,
  createAccessToken,
  createRefreshToken,
  setRefreshTokenCookie
} from './tokens';

/**
 * Generate a password hash.
 * @param password The password to create a hash for.
 * @returns A promise that resolves with the generated hash.
 */
export async function generatePasswordHash(password: string) {
  const saltLength = parseInt(process.env.PASSWORD_SALT_LENGTH ?? '12', 10);
  return await bcrypt.hash(password, saltLength);
}

/**
 * Compare a password to a hash.
 * @param password The password.
 * @param hash The hash to compare against.
 * @returns A promise that resolves with true if the password is valid.
 */
export async function comparePasswordHash(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

/**
 * Retrieve the access token payload stored in the authorization header.
 * @param req The HTTP/S request submitted.
 * @returns A promise that resolves with the authorization payload.
 */
export function getAuthorizationPayload(req: Request) {
  const { authorization } = req.headers;
  if (!authorization) throw new Error('Authentication not found.');

  // Auth header is in the format: 'Bearer {token}'
  const token = authorization.split(' ')[1];
  return getAccessTokenPayload(token);
}

/**
 * Log in a user and persist the session in the database. Then, send a response
 * containing the access token and additional metadata.
 * @param session The current database session.
 * @param res The HTTP/S response to set cookies on and send back.
 * @param eventId The internal identifier of the event.
 * @param eventUrl The url identifier of the event.
 * @param username The username of the user logging in.
 */
export async function login(
    session: any, res: Response, eventId: number,
    eventUrl: string, username: string, isAdmin: boolean = false) {
  const accessToken = createAccessToken(eventUrl, username, isAdmin);
  const refreshToken = createRefreshToken(eventUrl, username, isAdmin);

  // await database.setRefreshToken(session, eventId, username, refreshToken);

  setRefreshTokenCookie(res, refreshToken, eventUrl);
  res.send({
    eventUrl,
    accessToken,
    accessTokenLifetime: process.env.ACCESS_TOKEN_EXPIRY ?? '15m',
  });
}
