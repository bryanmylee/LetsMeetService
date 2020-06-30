import * as admin from 'firebase-admin';
import Interval from '../types/Interval';
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
 * @param eventIntervals The intervals in which the event is available. By
 * default, the person creating the event will have the same intervals as the
 * event itself.
 * @returns A promise that resolves to an object with the new internal
 * identifier and new url idenfifier.
 */
export async function createNewEvent(
    title: string, description: string,
    username: string, eventIntervals: Interval[]) {
  try {
    const ref = db.collection('event').doc();
    const { id: newId } = ref;
    const eventUrl = generateId(newId, 2);
    await ref.set({
      eventUrl,
      title,
      description,
      admin: username,
      eventIntervals: eventIntervals.map((interval) => interval.toMillis()),
    });
    return { newId, eventUrl };
  } catch (err) {
    throw err;
  }
}

/**
 * Get details of an event.
 * @param eventUrl The url identifier of the event.
 * @returns A promise that resolves to an object describing an event.
 */
export async function getEvent(eventUrl: string) {
  try {
    const snapshot = await db
        .collection('event')
        .where('eventUrl', '==', eventUrl)
        .get();
    const documents = snapshot.docs;
    if (documents.length > 1) {
      throw new Error(`Duplicate events with id ${eventUrl}`);
    } else if (documents.length === 0) {
      throw new Error(`Event with id ${eventUrl} not found`);
    }
    return documents[0].data();
  } catch (err) {
    throw err;
  }
}