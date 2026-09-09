#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleDecapAuth } from "../assistant-server/lib/decap-auth.mjs";

let status = 0;
let loc = "";
const res = {
  writeHead(code, headers) {
    status = code;
    loc = headers?.Location || "";
  },
  end() {},
};

await handleDecapAuth(
  { method: "GET", headers: {} },
  res,
  new URL("http://x/api/decap-auth"),
  {
    clientId: "test-client",
    clientSecret: "test-secret",
    publicOrigin: "https://penn-notes.draftly.cn",
  },
);

assert.equal(status, 302);
assert.ok(String(loc).includes("github.com/login/oauth/authorize"));
console.log("decap-auth-smoke: ok");
