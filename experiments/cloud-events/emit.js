#!/usr/bin/env node

//
// Usage: ./emit.js [email_address]
//

import { httpTransport, emitterFor, CloudEvent, HTTP } from "cloudevents";

//
// Script entry point
//
async function main() {
  const [email = "geoff@example.com"] = process.argv.slice(2);

  // Create an http emitter to talk to the listener.js server
  const emit = emitterFor(httpTransport("http://localhost:8080/endpoint"));

  // Create a new CloudEvent request
  const request = new CloudEvent({
    type: "reg_validation",
    source: "deconf/v0",
    data: {
      name: "Geoff Testington",
      email,
    },
  });

  // Emit the request and parse the http resposne
  const response = HTTP.toEvent(await emit(request));

  // Output the response event
  console.log("CloudEvent", JSON.stringify(response, null, 2));
}

main();
