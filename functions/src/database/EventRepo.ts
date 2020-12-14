import dayjs from 'dayjs';
import { generateId } from 'gfycat-ids';

import { db } from './Database';

import type Event from '../model/Event';
import type Interval from '../model/Interval';
type CollectionReference = FirebaseFirestore.CollectionReference;

export default class EventRepo {

  readonly repo: CollectionReference;
  constructor() {
    this.repo = db.collection('event');
  }

  /**
  * Get the query of an event with a given url identifier.
  * @param eventUrl The url identifier of the event.
  * @returns A query of the event document.
  */
  private async queryEvent(eventUrl: string) {
    const queried = await this.repo
        .where('eventUrl', '==', eventUrl)
        .get();
    if (queried.docs.length > 1) {
      throw new Error(`Duplicate events with id ${eventUrl}`);
    } else if (queried.docs.length === 0) {
      throw new Error(`Event with id ${eventUrl} not found`);
    }
    return queried.docs[0];
  }

  /**
  * Insert a new event into the database.
  * @param title       The title of the event.
  * @param description The description of the event.
  * @param color       The color hex of the event.
  * @param schedule    The event schedule.
  * @returns An pair of the new internal identifier and new url idenfifier.
  */
  async insert(
      title: string, description: string,
      color: string, schedule: Interval[]) {
    const newEventRef = this.repo.doc();
    const eventUrl = generateId(newEventRef.id, 2);
    await newEventRef.set({
      eventUrl,
      title,
      description,
      color,
      schedule,
      createdOn: dayjs().millisecond(),
    });
    return { newId: newEventRef.id, eventUrl };
  }

  /**
  * Get the details of an event with a given url identifier.
  * @param eventUrl The url identifier of the event.
  * @returns A promise that resolves to an object describing an event.
  */
  async get(eventUrl: string) {
    const eventQuery = await this.queryEvent(eventUrl);
    const event = eventQuery.data() as Event;
    const userQueries = await eventQuery.ref.collection('user').get();
    const userSchedules: Record<string, Interval[]> = {};
    userQueries.docs.forEach((doc) => {
      // usernames are used as user doc ids.
      userSchedules[doc.id] = doc.data().schedule ?? [];
    })
    return { ...event, userSchedules };
  }

  /**
  * Add a new user to an event.
  * @param eventUrl     The url identifier of the event.
  * @param username     The username of the new user.
  * @param passwordHash The password hash of the new user.
  * @param schedule     The available schedule of the user.
  */
  async insertUserOnEvent(
      eventUrl: string, username: string,
      passwordHash: string, schedule: Interval[] = []) {
    console.log(`got schedule ${schedule}`);
    const eventQuery = await this.queryEvent(eventUrl);
    const userRef = eventQuery.ref.collection('user').doc(username);
    if ((await userRef.get()).exists) {
      throw new Error(`Username ${username} already taken`);
    }
    await userRef.set({ passwordHash, schedule });
  }

  /**
  * Update schedule information of a user.
  * @param eventUrl    The url identifier of the event.
  * @param username    The username of the user.
  * @param newSchedule The new schedule of the user.
  */
  async updateUserOnEvent(
      eventUrl: string, username: string,
      newSchedule: Interval[] = []) {
    const eventQuery = await this.queryEvent(eventUrl);
    const userRef = eventQuery.ref.collection('user').doc(username);
    if (!(await userRef.get()).exists) {
      throw new Error(`User ${username} does not exist`);
    }
    await userRef.set({ schedule: newSchedule }, { merge: true });
  }

  /**
  * Get the password hash of a user.
  * @param eventUrl The url identifier of the event to which the user belongs.
  * @param username The username of the user to find credentials of.
  * @returns The password hash of the user.
  */
  async getUserPasswordHash(eventUrl: string, username: string) {
    const eventQuery = await this.queryEvent(eventUrl);
    const userRef = eventQuery.ref.collection('user').doc(username);
    const userDoc = await userRef.get();
    const user = userDoc.data() as {
      passwordHash: string,
      refreshToken: string,
    };
    if (user == null) {
      throw new Error(`User ${username} does not exist`);
    }
    return user.passwordHash;
  }

  /**
  * Get the refresh token of a user.
  * @param eventUrl The url identifier of the event to which the user belongs.
  * @param username The username of the user.
  * @returns A promise that resolves to the refresh token of the user.
  */
  async getUserRefreshToken(eventUrl: string, username: string) {
    const eventQuery = await this.queryEvent(eventUrl);
    const userRef = eventQuery.ref.collection('user').doc(username);
    const userDoc = await userRef.get();
    const user = userDoc.data() as {
      passwordHash: string,
      refreshToken: string,
    };
    if (user == null) {
      throw new Error(`User ${username} does not exist`);
    }
    return user.refreshToken;
  }

  /**
  * Set the refresh token of a user.
  * @param eventUrl     The url identifier of the event to which the user
  *                     belongs.
  * @param username     The username of the user.
  * @param refreshToken The refresh token to store.
  */
  async setUserRefreshToken(
      eventUrl: string, username: string, refreshToken: string) {
    const eventQuery = await this.queryEvent(eventUrl);
    const userRef = eventQuery.ref.collection('user').doc(username);
    userRef.set({ refreshToken }, { merge: true });
  }

}

