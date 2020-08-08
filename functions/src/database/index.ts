import * as admin from 'firebase-admin';
import { generateId } from 'gfycat-ids';
import dayjs from 'dayjs';
import UserType from '../types/UserType';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://lets-meet-firebase.firebaseio.com',
});

export const db = admin.firestore();

/**
 * Insert a new event into the database.
 * @param title The title of the event.
 * @param description The description of the event.
 * @param color: The color hex of the event.
 * @param scheduleInMs The intervals in which the event is available. By
 * default, the person creating the event will have the same intervals as the
 * event itself.
 * @returns A promise that resolves to an object with the new internal
 * identifier and new url idenfifier.
 */
export async function createNewEvent(
    title: string, description: string, color: string,
    scheduleInMs: { start: number, end: number }[]) {
  const eventRef = db.collection('event').doc();
  const { id: newId } = eventRef;
  const eventUrl = generateId(newId, 2);
  await eventRef.set({
    eventUrl,
    title,
    description,
    color,
    scheduleInMs,
    createdOn: +dayjs(),
  });
  return { newId, eventUrl };
}

/**
 * Get details of an event.
 * @param eventUrl The url identifier of the event.
 * @returns A promise that resolves to an object describing an event.
 */
export async function getEvent(eventUrl: string) {
  const queryDoc = await getQueryDoc(eventUrl);
  const event = queryDoc.data() as {
    title: string,
    eventUrl: string,
    description: string,
    color: string,
    admin: string,
    scheduleInMs: { start: number, end: number }[]
  };
  const userQuerySnapshot = await queryDoc.ref.collection('user').get();
  const userSchedulesInMs: {
    [username: string]: { start: number, end: number }[]
  } = {};
  userQuerySnapshot.docs.forEach((doc) => {
    userSchedulesInMs[doc.id] = doc.data().scheduleInMs ?? [];
  })
  return { ...event, userSchedulesInMs };
}

/**
 * Get the unique query document of the event with the url identifier.
 * @param eventUrl The url identifier of the event.
 * @returns A promise that resolves to the document referencing the event.
 */
async function getQueryDoc(eventUrl: string) {
  const snapshot = await db
      .collection('event')
      .where('eventUrl', '==', eventUrl)
      .get();
  const { docs: queryDocs } = snapshot;
  if (queryDocs.length > 1) {
    throw new Error(`Duplicate events with id ${eventUrl}`);
  } else if (queryDocs.length === 0) {
    throw new Error(`Event with id ${eventUrl} not found`);
  }
  return queryDocs[0];
}

/**
 * Add a new user to an event.
 * @param eventUrl The url identifier of the event.
 * @param username The username of the new user.
 * @param passwordHash The password hash of the new user.
 * @param scheduleInMs The intervals in which the user is available.
 * @param userType The type of user account.
 */
export async function insertNewUser(
    eventUrl: string, username: string, passwordHash: string,
    scheduleInMs: { start: number, end: number }[] = [],
    userType = UserType.DEFAULT) {
  const queryDoc = await getQueryDoc(eventUrl);
  const userRef = queryDoc.ref.collection('user').doc(username);
  if ((await userRef.get()).exists) {
    throw new Error('Username already taken');
  }
  await userRef.set({
    passwordHash,
    scheduleInMs,
    isAdmin: userType === UserType.ADMIN,
  });
}

/**
 * Update schedule information of a user.
 * @param eventUrl The url identifier of the event.
 * @param username The username of the user.
 * @param scheduleInMs The new schedule information of the user.
 */
export async function updateUserIntervals(
    eventUrl: string, username: string,
    newScheduleInMs: { start: number, end: number }[] = []) {
  const queryDoc = await getQueryDoc(eventUrl);
  const userRef = queryDoc.ref.collection('user').doc(username);
  await userRef.set({ scheduleInMs: newScheduleInMs }, { merge: true })
}

/**
 * Get the credentials of a user.
 * @param eventUrl The url identifier of the event to which the user belongs.
 * @param username The username of the user to find credentials of.
 * @returns A promise that resolves to an object containing the password hash of
 * the user account and admin status.
 * @throws An error if the user does not exist.
 */
export async function getUserCredentials(eventUrl: string, username: string) {
  const queryDoc = await getQueryDoc(eventUrl);
  const userRef = queryDoc.ref.collection('user').doc(username);
  const snapshot = await userRef.get();
  const user = snapshot.data() as {
    isAdmin: boolean,
    passwordHash: string,
    refreshToken: string,
  };
  if (user == null) {
    throw new Error('User not found');
  }
  return ({
    passwordHash: user.passwordHash,
    isAdmin: user.isAdmin,
  });
}

/**
 * Get the refresh token of a user stored in database.
 * @param eventUrl The url identifier of the event to which the user belongs.
 * @param username The username of the user.
 * @returns A promise that resolves to the refresh token of the user.
 * @throws An error if the user does not exist.
 */
export async function getRefreshToken(eventUrl: string, username: string) {
  const queryDoc = await getQueryDoc(eventUrl);
  const userRef = queryDoc.ref.collection('user').doc(username);
  const snapshot = await userRef.get();
  const user = snapshot.data() as {
    isAdmin: boolean,
    passwordHash: string,
    refreshToken: string,
  };
  if (user == null) {
    throw new Error('User not found');
  }
  return user.refreshToken;
}

/**
 * Store a user's refresh token to allow verification of refresh tokens.
 * @param eventUrl The url identifier of the event.
 * @param username The username to store the refresh token of.
 * @param refreshToken The refresh token to store.
 */
export async function storeRefreshToken(
    eventUrl: string, username: string, refreshToken: string) {
  const queryDoc = await getQueryDoc(eventUrl);
  await queryDoc.ref
      .collection('user')
      .doc(username)
      .set({ refreshToken }, { merge: true });
}