#!/usr/bin/env node

import { createServer } from "http";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

import express from "express";
import { createTerminus } from "@godaddy/terminus";
import WebSocket, { WebSocketServer } from "ws";

/** @type {{ rooms: string[] }} */
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

  const rooms = new Map(appConfig.rooms.map((id) => [id, new Room(id)]));

  wss.addListener("connection", (socket, request) => {
    const url = request.url ? new URL(request.url, "http://localhost") : null;
    const id = url.searchParams.get("id") ?? randomUUID();

    console.debug("socket@connect id=%o", id);
    const connection = new Connection(id, socket);

    const room = rooms.get(url.searchParams.get("room"));
    if (!room) {
      connection.send("error", "Room not found");
      return;
    }

    room.members.set(id, connection);
    room.update();

    socket.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, [type]: payload, target } = message;
        console.debug("socket@message id=%o type=%o to=%o", id, type, target);

        if (type === "ping") return connection.send("pong", {});

        const targetConn = room.members.get(message.target);
        if (targetConn) targetConn.send(type, payload, id);
        else console.error("Peer not online");
      } catch (error) {
        console.error("socket@message", error);
      }
    });
    socket.addEventListener("close", () => {
      console.debug("socket@close id=%o", id);

      room.members.delete(id);
      room.update();
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

class Room {
  /** @type {Map<string, Connection>} */
  members = new Map();

  /** @param {string} id */
  constructor(id) {
    this.id = id;
  }

  update() {
    for (const conn of this.members.values()) {
      conn.send("info", {
        id: conn.id,
        members: Array.from(this.members.values())
          .filter((m) => m.id !== conn.id)
          .map((peer) => ({
            id: peer.id,
            polite: conn.id > peer.id,
          })),
      });
    }
  }
}

class Connection {
  /** @param {string} id @param {WebSocket} socket */
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
  }

  send(type, message = {}, from = null) {
    this.socket.send(JSON.stringify({ type, [type]: message, from }));
  }
}

main();
