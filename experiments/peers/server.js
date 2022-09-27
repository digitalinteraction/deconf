#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync } from "fs";
import EventEmitter from "events";
import { parse as parsePath } from "path";

import express from "express";
// import { ExpressPeerServer } from "peer";
import { createTerminus } from "@godaddy/terminus";
import WebSocket, { WebSocketServer } from "ws";

/** @type {{ pairs: [string,string][] }} */
const appConfig = JSON.parse(readFileSync("app-config.json"));

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
  app.get("/sockets", (req, res) => {
    res.send({ sockets: Array.from(online.keys()) });
  });

  const server = createServer(app);

  // const peer = new ExpressPeerServer(server);
  // app.use("/peerjs", peer);

  const wss = new WebSocketServer({
    server,
    path: "/portal",
  });

  /** @type {Map<string, Connection} */
  const online = new Map();

  wss.addListener("connection", (socket, request) => {
    const url = request.url
      ? new URL(request.url, "http://localhost:8080")
      : null;
    const id = url?.searchParams.get("id");
    if (!id) return;

    const connection = new Connection(id, socket);
    online.set(id, connection);

    console.debug("socket@connect id=%o", id);

    socket.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, target } = message;
        console.debug("socket@message id=%o type=%o", id, type);

        const other = online.get(target);
        if (other) {
          other.send(type, message[type]);
        } else {
          connection.send("notOnline");
        }
      } catch (error) {
        console.error("socket@message", error);
      }
    });
    socket.addEventListener("close", () => {
      console.debug("socket@close id=%o", id);
      online.delete(id);
    });
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

class Connection {
  /** @param {string} id @param {WebSocket} socket */
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
  }

  send(type, message) {
    this.socket.send(JSON.stringify({ type, [type]: message }));
  }
}

main();
