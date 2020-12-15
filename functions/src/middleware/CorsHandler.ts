import * as functions from 'firebase-functions';
import cors from 'cors';
import { Request } from 'express';

const getAllowedHosts = () => {
  const hosts: string = functions.config().api.client_hosts;
  return hosts.split(",");
}

export const corsHandler = cors<Request>({
  origin: getAllowedHosts(),
  credentials: true,
});

