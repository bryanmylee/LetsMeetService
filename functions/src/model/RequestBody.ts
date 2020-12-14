import Interval from './Interval';

export interface UserSignup {
  username: string;
  password: string;
  schedule: Interval[];
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserScheduleEdit {
  newSchedule: Interval[];
}

