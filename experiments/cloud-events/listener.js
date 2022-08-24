#!/usr/bin/env node

//
// Usage: ./listener.js
//

import { createServer, IncomingMessage } from "http";
import { CloudEvent, HTTP } from "cloudevents";

const APP_PORT = 8080;

function parseContentType(input) {
  const [mediaType = null, args = ""] = input?.split(/\s*;\s*/) ?? [];
  return { mediaType, mediaOptions: new URLSearchParams(args) };
}

/**
 * @param {IncomingMessage} req
 *
 * A hacky method to parse the chunks of data in the request body and parse json
 */
function parseRequestBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const { mediaType, mediaOptions } = parseContentType(
        req.headers["content-type"]
      );
      const encoding = mediaOptions.get("charset") ?? "utf8";

      if (mediaType === "application/json") {
        resolve(JSON.parse(body.toString(encoding)));
      } else {
        resolve(body);
      }
    });
    req.on("error", (error) => reject(error));
  });
}

//
// Script entry point
//
async function main() {
  const server = createServer(async (req, res) => {
    // Short-circuit head requests and ok early
    if (req.method === "HEAD") {
      res.end("ok");
      return;
    }

    // TODO: add check if the body could actually be a CloudEvent first
    // check the headers?
    const body = await parseRequestBody(req);
    const event = HTTP.toEvent({ headers: req.headers, body: body });

    // If a CloudEvent, log and respond to it
    if (event) {
      const response = new CloudEvent({
        ...event,
        source: "some/webhook",
        type: "reg_validation:response",
        data: { result: event.data?.email === "geoff@example.com" },
      });
      console.log("CloudEvent", JSON.stringify(event, null, 2));

      if (event.source !== "deconf/v0" || event.type !== "reg_validation") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const message = HTTP.structured(response);
      for (const [key, value] of Object.entries(message.headers)) {
        res.setHeader(key, value);
      }
      res.end(message.body);
      return;
    }

    // Fall back to logging http info
    console.log("%s %s %o", req.method, req.url, new Date(), req.headers);
    console.log("body", body);
    console.log();
    res.end("ok");
  });

  server.listen(APP_PORT, () => console.log(`Listening on :${APP_PORT}\n`));
}

main();
