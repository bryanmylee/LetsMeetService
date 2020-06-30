import * as functions from 'firebase-functions';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import UserType from './types/UserType';

/**
 * Generate a signed access token with a specified payload.
 * @param eventUrl The url identifier of the event being accessed.
 * @param username The username of the user for the access token.
 * @param userType The type of the user.
 * @returns A signed access token with the specified payload.
 */
export function createAccessToken(
    eventUrl: string, username: string, userType: UserType = UserType.DEFAULT) {
  const payload = {
    evt: eventUrl,
    uid: username,
    adm: userType === UserType.ADMIN,
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
    adm: boolean,
  } = jwt.verify(token, functions.config().api.access_secret) as any;
  return {
    eventUrl: payload.evt,
    username: payload.uid,
    isAdmin: payload.adm,
  };
}

/**
 * Generate a signed refresh token with a specified payload.
 * @param eventUrl The url identifier of the event being accessed.
 * @param username The username of the user for the access token.
 * @param userType The type of the user.
 * @returns A signed refresh token with the specified payload.
 */
export function createRefreshToken(
    eventUrl: string, username: string, userType: UserType = UserType.DEFAULT) {
  const payload = {
    evt: eventUrl,
    uid: username,
    adm: userType === UserType.ADMIN,
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
    adm: boolean,
  } = jwt.verify(token, functions.config().api.refresh_secret) as any;
  return {
    eventUrl: payload.evt,
    username: payload.uid,
    isAdmin: payload.adm,
  };
}

/**
 * Store a refresh token as a protected cookie on the client.
 * @param res The response to send to the client.
 * @param refreshToken The refresh JWT.
 * @param eventUrl The url identifier of the event this token is for.
 */
export function setRefreshTokenCookie(
    res: Response, refreshToken: string, eventUrl: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    path: `/${eventUrl}/refresh_token`,
  });
}
