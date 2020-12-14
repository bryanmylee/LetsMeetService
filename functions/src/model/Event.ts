import Interval from "./Interval";

export default interface Event {
  title: string;
  eventUrl?: string;
  description: string;
  color: string;
  scheduleInMs: Interval[];
}

