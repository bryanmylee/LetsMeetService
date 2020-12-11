import * as functions from 'firebase-functions';
import bcrypt from 'bcryptjs';
import { Response, Request } from 'express';

import Database from './database';
import Token from './tokens';

namespace Auth {
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
  export function getRequestAuthPayload(req: Request) {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new Error('Authentication not found');
    }
    // Auth header is in the format: 'Bearer {token}'
    const token = authorization.split(' ')[1];
    return Token.getAccessTokenBody(token);
  }

  /**
   * If a refresh token exists, generate a new access token and persist a new
   * refresh token in the database and on the client browser.
   * @param req The HTTP/S request submitted.
   * @param res The HTTP/S response to send.
   * @returns A promise that resolves with the new access token.
   */
  export async function refreshAccessToken(req: any, res: any) {
      // Parse the request.
      const { eventUrl } = req.params;
      const refreshToken: string = req.cookies['__session'];
      // Verify the request.
      if (refreshToken == null) {
        throw new Error('Refresh token not found');
      }
      // Verify that the token is not tampered with, and retrieve the payload.
      const { username } = Token.getRefreshTokenBody(refreshToken);
      // Handle database logic.
      const storedRefreshToken = await Database.getRefreshToken(eventUrl, username);
      if (storedRefreshToken == null) {
        throw new Error('User invalid');
      }
      if (storedRefreshToken !== refreshToken) {
        throw new Error('Refresh token invalid');
      }
      // Return a response.
      const { accessToken, refreshToken: newRefreshToken }
          = await generateAndPersistTokens(eventUrl, username);
      setRefreshTokenCookie(req, res, eventUrl, newRefreshToken);
      return accessToken;
  }

  /**
   * Log in a user and persist the session in the database.
   * @param eventUrl The url identifier of the event.
   * @param username The username of the user logging in.
   * @param userType The type of the user.
   * @returns The access token generated from the login.
   */
  export async function generateAndPersistTokens(
      eventUrl: string, username: string) {
    const accessToken = Token.createAccessToken(eventUrl, username);
    const refreshToken = Token.createRefreshToken(eventUrl, username);

    // Store the refresh token in the database.
    await Database.storeRefreshToken(eventUrl, username, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Set the refresh token on the client with a HTTP only cookie.
   * @param req The request sent from the client.
   * @param res The response to send to the client.
   * @param eventUrl The url identifier of the event this token is for.
   * @param refreshToken The refresh JWT.
   */
  export function setRefreshTokenCookie(
      req: Request, res: Response, eventUrl: string, refreshToken: string) {
    res.cookie('__session', refreshToken, {
      httpOnly: true,
      path: `${getBasePath(req, eventUrl)}`,
    });
  }

  /**
   * Clear the refresh token cookie for an event.
   * @param req The request sent from the client.
   * @param res The response to send to the client.
   * @param eventUrl The url identifier of the event this token is for.
   */
  export function clearRefreshTokenCookie(
      req: Request, res: Response, eventUrl: string) {
    res.clearCookie('__session', {
      path: `${getBasePath(req, eventUrl)}`,
    });
  }

  /**
   * Get the base path of the current API endpoint. The request is required to
   * determine the current path of the api endpoint. This allows us to dynamically
   * update the path of the endpoint, such that the path of the cookie matches the
   * refresh endpoint.
   * @param req The request sent from the client.
   * @param eventUrl The url identifier of the event this token is for.
   * @returns The base path, ending with the eventUrl.
   */
  function getBasePath(req: Request, eventUrl: string) {
    // Since eventUrl is consistently at the end of the path, we can use that to
    // find the current path.
    const tokens = req.originalUrl.split(eventUrl);
    // Use the second last token, as it is possible to have an endpoint path that
    // could contain the eventUrl. We want the last instance of eventUrl.
    return tokens[tokens.length - 2] + eventUrl;
  }
}

export default Auth;
