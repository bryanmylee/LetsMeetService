import * as admin from 'firebase-admin';
import { generateId } from 'gfycat-ids';
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
 * @param username The username of the person creating the event.
 * @param passwordHash The password hash of the person creating the event.
 * @param scheduleInMs The intervals in which the event is available. By
 * default, the person creating the event will have the same intervals as the
 * event itself.
 * @returns A promise that resolves to an object with the new internal
 * identifier and new url idenfifier.
 */
export async function createNewEvent(
    title: string, description: string,
    username: string, passwordHash: string,
    scheduleInMs: { start: number, end: number }[]) {
  const batch = db.batch();
  const eventRef = db.collection('event').doc();
  const { id: newId } = eventRef;
  const eventUrl = generateId(newId, 2);
  batch.set(eventRef, {
    eventUrl,
    title,
    description,
    admin: username,
    scheduleInMs,
  });
  const userRef = eventRef.collection('user').doc(username);
  batch.set(userRef, {
    passwordHash,
    isAdmin: true,
  });
  await batch.commit();
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
    admin: string,
    scheduleInMs: { start: number, end: number }[]
  };
  const querySnapshot = await queryDoc.ref.collection('user').get();
  const userSchedulesEntries = querySnapshot.docs.map((doc) =>
      [ doc.id, doc.data().scheduleInMs ]);
  const userSchedulesInMs = Object.fromEntries(userSchedulesEntries) as {
    [username: string]: { start: number, end: number }[]
  };
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
    scheduleInMs: { start: number, end: number }[],
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
 * Get the credentials of a user.
 * @param eventUrl The url identifier of the event to which the user belongs.
 * @param username The username of the user to find credentials of.
 * @returns A promise that resolves to an object containing the password hash of
 * the user account and admin status. If the user does not exist, return a
 * promise that resolves to null.
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