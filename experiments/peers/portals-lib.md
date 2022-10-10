## portal.js

> This doc is a design for how the peer-logic could be turned into a JavaScript library

A JS library for WebRTC connections between multiple peers.

**server.js**

An easy option which requires a peer dependency of [ws](https://www.npmjs.com/package/ws).

```js
import http from "http";
import { PortalServer } from "@openlab/portals";

const rooms = ["coffee-chat", "home", "misc"];
const server = http.createServer(/* ... */);
const portal = new PortalServer({ server, path: "/portal", rooms });

server.listen(/* ... */);
```

**raw_server.js**

An option with no NPM or Node dependencies, can it work with Deno?

```js
const server = http.createServer(/* ... */);
const wss = new WebSocketServer(/* { ... } */);
const portals = new PortalServer({ noServer: true });

class Connection {
  constructor(socket, id, room) {
    this.socket = socket;
    this.id = id;
    this.room = room;
  }
  send(type, payload = {}, from = null) {
    this.socket.send(JSON.stringify({ type, [type]: payload, from }));
  }
}

wss.on("connection", (socket, req) => {
  const { id, room } = "(get from request or generate)";
  const connection = new Connection(socket, id, room);
  portals.onConnection(connection);
  socket.on("message", (event) => {
    const { type, [type]: payload, target = null } = JSON.parse(event.data);
    portals.onMessage(connection, type, payload, target);
  });
  socket.on("close", () => portals.onClose(connection));
});
portals.on("error", console.error);
portals.on("debug", console.debug);

server.listen(/* ... */);
```

**client.js**

Create a portal in-browser.

```js
const stream = navigator.mediaDevices.getStream(/* ... */);
const portal = new Portal({ roomId, serverUrl });

portal.addEventListener("connection", (connection) => {
  for (const t of stream.getTracks()) {
    connection.addTrack(t, stream);
  }
  connection.on("track", (track) => renderTrack(connection, track));
});

portal.addEventListener("close", (connection) => {
  renderTrack(connection, null);
});

portal.addEventListener("info", (info) => {
  updateState(info);
});
```

## next thoughts

- designing the server to be scalable
- dynamic rooms
- TypeScript types
- `export { PortalServer as PortalGun }` — easter-egg
