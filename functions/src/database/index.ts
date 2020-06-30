import * as admin from 'firebase-admin';
import { generateId } from 'gfycat-ids';

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
    username: string, scheduleInMs: { start: number, end: number }[]) {
  const ref = db.collection('event').doc();
  const { id: newId } = ref;
  const eventUrl = generateId(newId, 2);
  await ref.set({
    eventUrl,
    title,
    description,
    admin: username,
    scheduleInMs,
  });
  return { newId, eventUrl };
}

/**
 * Get details of an event.
 * @param eventUrl The url identifier of the event.
 * @returns A promise that resolves to an object describing an event.
 */
export async function getEvent(eventUrl: string) {
  return (await getQueryDoc(eventUrl)).data();
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

export enum UserType {
  ADMIN,
  DEFAULT,
};

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
  await queryDoc.ref.collection('user').doc(username).set({
    passwordHash,
    scheduleInMs,
    isAdmin: userType === UserType.ADMIN,
  });
}
