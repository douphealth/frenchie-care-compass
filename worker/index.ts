import { handleRequest } from "./handle";
import { ASSETS } from "./assets.gen.js";
import type { CareEnv } from "./payments";

export default {
  async fetch(request: Request, env: CareEnv): Promise<Response> {
    return handleRequest(request, env, ASSETS);
  },
};
