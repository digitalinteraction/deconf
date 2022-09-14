#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync } from "fs";

import express from "express";
import { ExpressPeerServer } from "peer";

async function main() {
  /** @type {{pairs:[string,string][]}} */
  const appConfig = JSON.parse(readFileSync("app-config.json"));

  const app = express().use(express.static("app"));
  app.set("trust proxy", true);
  app.get("/api/", (req, res) => {
    res.send("ok");
  });
  app.get("/api/pairs/:id", async (req, res) => {
    const pair = appConfig.pairs.find((p) => p.includes(req.params.id));
    if (pair) {
      const index = pair[0] === req.params.id ? 1 : 0;
      const id = pair[index];
      res.send({ id, index });
    } else {
      res.statusCode = 404;
      res.send("Not found");
    }
  });

  const server = createServer(app);

  const peer = new ExpressPeerServer(server);
  app.use("/peerjs", peer);

  // peer.on("connection", (e) => {
  //   console.log(e.id);
  // });

  server.listen(8080, () => console.log("Listening on :8080"));
}

main();
