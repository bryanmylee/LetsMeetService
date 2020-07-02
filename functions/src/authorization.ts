import * as functions from 'firebase-functions';
import { Response, Request } from 'express';
import bcrypt from 'bcryptjs';

import {
  getAccessTokenPayload,
  createAccessToken,
  createRefreshToken,
} from './tokens';
import { storeRefreshToken } from './database';
import UserType from './types/UserType';

/**
 * Generate a password hash.
 * @param password The password to create a hash for.
 * @returns A promise that resolves with the generated hash.
 */
export async function generatePasswordHash(password: string) {
  const saltLength
      = parseInt(functions.config().api.password_salt_length ?? '12', 10);
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
 * Log in a user and persist the session in the database.
 * @param eventUrl The url identifier of the event.
 * @param username The username of the user logging in.
 * @param userType The type of the user.
 * @returns The access token generated from the login.
 */
export async function generateAndPersistTokens(
    eventUrl: string, username: string, userType: UserType = UserType.DEFAULT) {
  const accessToken = createAccessToken(eventUrl, username, userType);
  const refreshToken = createRefreshToken(eventUrl, username, userType);

  // Store the refresh token in the database.
  await storeRefreshToken(eventUrl, username, refreshToken);

  return { accessToken, refreshToken };
}

/**
 * Set the refresh token on the client with a HTTP only cookie. The request is
 * required to determine the current path of the api endpoint. This allows us to
 * dynamically update the path of the endpoint, such that the path of the cookie
 * matches the refresh endpoint.
 * @param req The request send from the client.
 * @param res The response to send to the client.
 * @param eventUrl The url identifier of the event this token is for.
 * @param refreshToken The refresh JWT.
 */
export function setRefreshTokenCookie(
    req: Request, res: Response, eventUrl: string, refreshToken: string) {
  // Since eventUrl is consistently at the end of the path, we can use that to
  // find the current path.
  const tokens = req.originalUrl.split(eventUrl);
  // Use the second last token, as it is possible to have an endpoint path that
  // could contain the eventUrl. We want the last instance of eventUrl.
  const basePath = tokens[tokens.length - 2] + eventUrl;
  res.cookie('__session', refreshToken, {
    httpOnly: true,
    path: `${basePath}/refresh_token`,
  });
}