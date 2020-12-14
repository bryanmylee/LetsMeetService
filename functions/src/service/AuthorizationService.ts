import * as functions from 'firebase-functions';
import bcrypt from 'bcryptjs';
import { Request } from 'express';

import EventRepo from '../database/EventRepo';
import TokenService from '../service/TokenService';
import { setRefreshToken } from '../middlewares/CookieMiddleware';

export default class AuthorizationService {

  constructor(private eventRepo: EventRepo) {}

  /**
   * Generate a password hash.
   * @param password The password to create a hash for.
   * @returns A promise that resolves with the generated hash.
   */
  static async getPasswordHash(password: string) {
    const saltLengthStr = functions.config().api.password_salt_length ?? '12';
    const saltLength = parseInt(saltLengthStr, 10);
    return await bcrypt.hash(password, saltLength);
  }

  /**
   * Compare a password to a hash.
   * @param password The password.
   * @param hash     The hash to compare against.
   * @returns A promise that resolves with true if the password is valid.
   */
  static async comparePasswordHash(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Retrieve the access token payload stored in the authorization header.
   * @param req The HTTP/S request submitted.
   * @returns A promise that resolves with the authorization payload.
   */
  static getRequestAuthPayload(req: Request) {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new Error('Authentication not found');
    }
    // Auth header is in the format: 'Bearer {token}'
    const encodedToken = authorization.split(' ')[1];
    return TokenService.getAccessTokenBody(encodedToken);
  }

  /**
   * If a refresh token exists, generate a new access token and persist a new
   * refresh token in the database and on the client browser.
   * @param req The HTTP/S request submitted.
   * @param res The HTTP/S response to send.
   * @returns A promise that resolves with the new access token.
   */
  async refreshAccessToken(req: any, res: any) {
    const { eventUrl } = req.params;
    const refreshToken: string = req.cookies['__session'];
    if (refreshToken == null) {
      throw new Error('Refresh token not found');
    }
    // Verify that the token is not tampered with, and retrieve the payload.
    const { username } = TokenService.getRefreshTokenBody(refreshToken);
    // Handle database logic.
    const storedRefreshToken = await this.eventRepo.getUserRefreshToken(eventUrl, username);
    if (storedRefreshToken == null) {
      throw new Error('User invalid');
    }
    if (storedRefreshToken !== refreshToken) {
      throw new Error('Refresh token invalid');
    }
    // Return a response.
    const { accessToken, refreshToken: newRefreshToken }
        = await this.generateAndPersistTokens(eventUrl, username);
    setRefreshToken(eventUrl, newRefreshToken)(req, res, () => {});
    return accessToken;
  }

  /**
   * Log in a user and persist the session in the database.
   * @param eventUrl The url identifier of the event.
   * @param username The username of the user logging in.
   * @param userType The type of the user.
   * @returns The access token generated from the login.
   */
  async generateAndPersistTokens(eventUrl: string, username: string) {
    const accessToken = TokenService.createAccessToken(eventUrl, username);
    const refreshToken = TokenService.createRefreshToken(eventUrl, username);

    // Store the refresh token in the database.
    await this.eventRepo.setUserRefreshToken(eventUrl, username, refreshToken);

    return { accessToken, refreshToken };
  }

}

