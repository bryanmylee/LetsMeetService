import Interval from "./Interval";

export interface UserSignup {
  username: string;
  password: string;
  scheduleInMs: Interval[];
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserScheduleEdit {
  newScheduleInMs: Interval[];
}

