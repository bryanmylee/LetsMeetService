export default class JwtBody {

  constructor(public eventUrl: string, public username: string) {}

  /**
   * Get a formatted object representing the JwtBody.
   */
  formatted() {
    return {
      eventUrl: this.eventUrl,
      username: this.username,
    };
  }

  /**
   * Get a coded object representing the JwtBody.
   */
  coded() {
    return {
      evt: this.eventUrl,
      uid: this.username,
    };
  }

  /**
   * Get a JwtBody from a coded object.
   */
  static fromCoded(code: { evt: string, uid: string }) {
    return new JwtBody(code.evt, code.uid);
  }

}

