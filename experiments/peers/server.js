#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync } from "fs";

import express from "express";
import { ExpressPeerServer } from "peer";
import { createTerminus } from "@godaddy/terminus";

/** @type {{ pairs: [string,string][] }} */
const appConfig = JSON.parse(readFileSync("app-config.json"));

const onlinePeers = new Set();

function getPair(id) {
  return appConfig.pairs.find((p) => p.includes(id));
}

async function main() {
  const app = express().use(express.static("app")).use(express.text());

  app.set("trust proxy", true);
  app.get("/api/", (req, res) => {
    res.send("ok");
  });
  app.get("/api/pairs/:id", async (req, res) => {
    const pair = getPair(req.params.id);
    if (!pair) return res.status(404).send("Not found");

    const otherIndex = pair[0] === req.params.id ? 1 : 0;
    const otherId = pair[otherIndex];
    // const action = otherIndex === 1 ? "call" : "wait";

    console.log(onlinePeers, otherId);

    res.send({
      id: otherId,
      // action: onlinePeers.has(otherId) ? "call" : "wait",
      action: otherIndex === 1 ? "call" : "wait",
    });
  });
  app.post("/api/log/:id", async (req, res) => {
    const pair = getPair(req.params.id);
    if (!pair) return res.status(404).send("Not found");

    console.log("log id=%o", req.params.id, req.body);
    res.send("ok");
  });

  const server = createServer(app);

  const peer = new ExpressPeerServer(server);
  app.use("/peerjs", peer);

  // Keep track of online peers, decide who calls who?
  peer.on("connection", (client) => {
    onlinePeers.add(client.id);
  });
  peer.on("disconnect", (client) => {
    onlinePeers.delete(client.id);
  });

  server.listen(8080, () => console.log("Listening on :8080"));

  createTerminus(server, {
    signals: ["SIGINT", "SIGTERM"],
    healthChecks: {
      "/healthz": () => "ok",
    },
    async beforeShutdown() {
      console.debug("terminus@beforeShutdown");
    },
    async onSignal() {
      console.debug("terminus@onSignal");
      peer.close();
    },
  });
}

main();
