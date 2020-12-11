import * as functions from 'firebase-functions';
import jwt from 'jsonwebtoken';

namespace Token {
  /**
   * Generate a signed access token with a specified payload.
   * @param eventUrl The url identifier of the event being accessed.
   * @param username The username of the user for the access token.
   * @returns A signed access token with the specified payload.
   */
  export function createAccessToken(
      eventUrl: string, username: string) {
    const payload = {
      evt: eventUrl,
      uid: username,
    };
    return jwt.sign(payload, functions.config().api.access_secret, {
      expiresIn: functions.config().api.access_expiry ?? '15m',
    });
  }

  /**
   * Decrypt and retrieve the payload of an access token.
   * @param token The token to decrypt.
   * @returns The decrypted payload of the access token.
   */
  export function getAccessTokenPayload(token: string) {
    const payload: {
      evt: string,
      uid: string,
    } = jwt.verify(token, functions.config().api.access_secret) as any;
    return {
      eventUrl: payload.evt,
      username: payload.uid,
    };
  }

  /**
   * Generate a signed refresh token with a specified payload.
   * @param eventUrl The url identifier of the event being accessed.
   * @param username The username of the user for the access token.
   * @returns A signed refresh token with the specified payload.
   */
  export function createRefreshToken(
      eventUrl: string, username: string) {
    const payload = {
      evt: eventUrl,
      uid: username,
    };
    return jwt.sign(payload, functions.config().api.refresh_secret, {
      expiresIn: functions.config().api.refresh_expiry ?? '1d',
    });
  }

  /**
   * Decrypt and retrieve the payload of a refresh token.
   * @param token The token to decrypt.
   * @returns The decrypted payload of the refresh token.
   */
  export function getRefreshTokenPayload(token: string) {
    const payload: {
      evt: string,
      uid: string,
    } = jwt.verify(token, functions.config().api.refresh_secret) as any;
    return {
      eventUrl: payload.evt,
      username: payload.uid,
    };
  }
}

export default Token;
