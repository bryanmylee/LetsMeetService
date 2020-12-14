import * as functions from 'firebase-functions';
import jwt from 'jsonwebtoken';

import JwtBody from '../model/JwtBody';

export default class TokenService {

  static accessExpiry = functions.config().api.access_expiry ?? '15m';
  static accessSecret = functions.config().api.access_secret;
  static refreshExpiry = functions.config().api.refresh_expiry ?? '1d';
  static refreshSecret = functions.config().api.refresh_secret;

  /**
   * Generate a signed access token with a specified payload.
   * @param eventUrl The url identifier of the event being accessed.
   * @param username The username of the user for the access token.
   * @returns A signed access token with the specified payload.
   */
  static createAccessToken(eventUrl: string, username: string) {
    const payload = new JwtBody(eventUrl, username);
    return jwt.sign(payload.coded(), TokenService.accessSecret, {
      expiresIn: TokenService.accessExpiry,
    });
  }

  /**
   * Decrypt and retrieve the payload of an access token.
   * @param token The token to decrypt.
   * @returns The decrypted payload of the access token.
   */
  static getAccessTokenBody(token: string) {
    const payload = JwtBody.fromCoded(
        jwt.verify(token, TokenService.accessSecret) as any);
    return payload.formatted();
  }

  /**
   * Generate a signed refresh token with a specified payload.
   * @param eventUrl The url identifier of the event being accessed.
   * @param username The username of the user for the access token.
   * @returns A signed refresh token with the specified payload.
   */
  static createRefreshToken(eventUrl: string, username: string) {
    const payload = new JwtBody(eventUrl, username);
    return jwt.sign(payload.coded(), TokenService.refreshSecret, {
      expiresIn: TokenService.refreshExpiry,
    });
  }

  /**
   * Decrypt and retrieve the payload of a refresh token.
   * @param token The token to decrypt.
   * @returns The decrypted payload of the refresh token.
   */
  static getRefreshTokenBody(token: string) {
    const payload = JwtBody.fromCoded(
        jwt.verify(token, TokenService.refreshSecret) as any);
    return payload.formatted();
  }

}

