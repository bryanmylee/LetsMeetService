import Interval from "./Interval";

export default interface UserSignup {
  username: string;
  password: string;
  scheduleInMs: Interval[];
}
