#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync } from "fs";
import EventEmitter from "events";

import express from "express";
import { createTerminus } from "@godaddy/terminus";
import WebSocket, { WebSocketServer } from "ws";

/** @type {{ pairs: [string,string][] }} */
const appConfig = JSON.parse(readFileSync("app-config.json"));

/** @type {Map<string, Connection} */
const online = new Map();

function getPair(id) {
  return appConfig.pairs.find((p) => p.includes(id));
}
function getInfo(id) {
  const peer = getPair(id);
  const target = peer[0] === id ? peer[1] : peer[0];
  const action = online.has(target) ? "call" : "wait";
  const polite = peer[0] === id;
  return { id, target, action, polite };
}

async function main() {
  const app = express().use(express.static("app")).use(express.text());

  app.set("trust proxy", true);
  app.get("/api/", (req, res) => {
    res.send("ok");
  });
  app.post("/api/log/:id", async (req, res) => {
    const pair = getPair(req.params.id);
    if (!pair) return res.status(404).send("Not found");

    console.log("log id=%o", req.params.id, req.body);
    res.send("ok");
  });

  const server = createServer(app);

  const wss = new WebSocketServer({
    server,
    path: "/portal",
  });

  wss.addListener("connection", (socket, request) => {
    const url = request.url ? new URL(request.url, "http://localhost") : null;
    const id = url?.searchParams.get("id");
    const peer = id ? getPair(id) : null;
    if (!id || !peer) return;

    console.debug("socket@connect id=%o", id);
    const target = peer[0] === id ? peer[1] : peer[0];
    const connection = new Connection(id, socket);
    online.set(id, connection);

    // Tell the connecter and their target what to do (if target is online)
    connection.send("info", getInfo(id));
    online.get(target)?.send("info", getInfo(target));

    socket.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, [type]: payload } = message;
        console.debug("socket@message id=%o type=%o", id, type);

        const other = online.get(target);
        if (other) other.send(type, payload);
        else {
          // connection.send("info", getInfo(id));
          console.error("Peer not online");
        }
      } catch (error) {
        console.error("socket@message", error);
      }
    });
    socket.addEventListener("close", () => {
      console.debug("socket@close id=%o", id);
      online.delete(id);

      online.get(target)?.send("info", getInfo(target));
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
