import * as functions from 'firebase-functions';
import jwt from 'jsonwebtoken';

class JwtBody {
  constructor(public eventUrl: string, public username: string) {}

  formatted() {
    return {
      eventUrl: this.eventUrl,
      username: this.username,
    };
  }

  coded() {
    return {
      evt: this.eventUrl,
      uid: this.username,
    };
  }

  static fromCoded(code: { evt: string, uid: string }) {
    return new JwtBody(code.evt, code.uid);
  }
}

namespace Token {
  /**
   * Generate a signed access token with a specified payload.
   * @param eventUrl The url identifier of the event being accessed.
   * @param username The username of the user for the access token.
   * @returns A signed access token with the specified payload.
   */
  export function createAccessToken(eventUrl: string, username: string) {
    const payload = new JwtBody(eventUrl, username);
    return jwt.sign(payload.coded(), functions.config().api.access_secret, {
      expiresIn: functions.config().api.access_expiry ?? '15m',
    });
  }

  /**
   * Decrypt and retrieve the payload of an access token.
   * @param token The token to decrypt.
   * @returns The decrypted payload of the access token.
   */
  export function getAccessTokenPayload(token: string) {
    const payload = JwtBody.fromCoded(
        jwt.verify(token, functions.config().api.access_secret) as any);
    return payload.formatted();
  }

  /**
   * Generate a signed refresh token with a specified payload.
   * @param eventUrl The url identifier of the event being accessed.
   * @param username The username of the user for the access token.
   * @returns A signed refresh token with the specified payload.
   */
  export function createRefreshToken(eventUrl: string, username: string) {
    const payload = new JwtBody(eventUrl, username);
    return jwt.sign(payload.coded(), functions.config().api.refresh_secret, {
      expiresIn: functions.config().api.refresh_expiry ?? '1d',
    });
  }

  /**
   * Decrypt and retrieve the payload of a refresh token.
   * @param token The token to decrypt.
   * @returns The decrypted payload of the refresh token.
   */
  export function getRefreshTokenPayload(token: string) {
    const payload = JwtBody.fromCoded(
        jwt.verify(token, functions.config().api.refresh_secret) as any);
    return payload.formatted();
  }
}

export default Token;
