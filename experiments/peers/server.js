#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync } from "fs";
import EventEmitter from "events";

import express from "express";
import { ExpressPeerServer } from "peer";
import { createTerminus } from "@godaddy/terminus";

/** @type {{ pairs: [string,string][] }} */
const appConfig = JSON.parse(readFileSync("app-config.json"));

// TODO: not really used
const onlinePeers = new Set();

// An event bus for peers disconnecting
const disconnectBus = new EventEmitter();

function getPair(id) {
  return appConfig.pairs.find((p) => p.includes(id));
}

async function main() {
  const app = express().use(express.static("app")).use(express.text());

  app.set("trust proxy", true);
  app.get("/api/", (req, res) => {
    res.send("ok");
  });
  // For a pair, get the other's id and whether to call or wait
  app.get("/api/pairs/:id", async (req, res) => {
    const pair = getPair(req.params.id);
    if (!pair) return res.status(404).send("Not found");

    const otherIndex = pair[0] === req.params.id ? 1 : 0;

    res.send({
      id: pair[otherIndex],
      // action: onlinePeers.has(pair[otherIndex]) ? "call" : "wait",
      action: otherIndex === 1 ? "call" : "wait",
    });
  });
  // For a given peer, log a debug message to stdout
  app.post("/api/log/:id", async (req, res) => {
    const pair = getPair(req.params.id);
    if (!pair) return res.status(404).send("Not found");

    console.log("log id=%o", req.params.id, req.body);
    res.send("ok");
  });
  // Keep a connection alive until a peer disconnects, e.g. "dead mans switch"
  app.get("/api/online/:id", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // keep alive until the socket disconnects
    const handler = () => res.end();
    disconnectBus.once(req.params.id, handler);
    res.on("close", () => disconnectBus.removeListener(req.params.id, handler));
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
    disconnectBus.emit(client.id);
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
