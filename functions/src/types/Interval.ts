import { firestore } from 'firebase-admin';

// A class that represents an interval of time.
export default class Interval {
  start: firestore.Timestamp;
  end: firestore.Timestamp;
  private constructor(start: firestore.Timestamp, end: firestore.Timestamp) {
    this.start = start;
    this.end = end;
  }

  // Get an interval from the number of milliseconds since Unix epoch.
  static fromMillis(interval: { start: number, end: number }) {
    return new Interval(
      firestore.Timestamp.fromMillis(interval.start),
      firestore.Timestamp.fromMillis(interval.end)
    );
  }

  // Represent an interval by the number of milliseconds since Unix epoch.
  toMillis(): { start: number, end: number } {
    return { start: this.start.toMillis(), end: this.end.toMillis() };
  }
}

export const intervalConverter = ({
  toFirestore: (interval: Interval) => interval.toMillis,
  fromFirestore: (snapshot: firestore.QueryDocumentSnapshot) => {
    const data = snapshot.data();
    return Interval.fromMillis(data as { start: number, end: number });
  }
});