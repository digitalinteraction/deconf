// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server

import { EventEmitter, appOptions } from "./lib.js";

export class SignalingChannel {
  /** @type {string[]} */ upstream = [];
  /** @type {WebSocket} */ socket = null;
  events = new EventEmitter();

  /** @param {{ id: string, server: URL }} options */
  constructor(options) {
    this.target = options.target;
    const url = new URL(options.server);
    url.searchParams.set("room", options.id);
    this.connect(url);

    this.addEventListener("info", (payload) => {
      this.id = payload.id;
    });

    setInterval(() => this.send("ping", {}), 10_000);
  }
  connect(url) {
    const socketUrl = new URL(url);
    if (this.id) socketUrl.searchParams.set("id", this.id);
    this.socket = new WebSocket(socketUrl);
    this.socket.onmessage = (event) => {
      this.lastMessage = new Date();
      const { type, [type]: payload, from } = JSON.parse(event.data);
      console.debug("signaler@%s %O", type, payload);
      this.events.emit(type, payload, from);
    };
    this.socket.onopen = () => {
      console.debug("socket@open");
      for (const msg of this.upstream) this.socket.send(msg);
      this.upstream = [];
    };
    this.socket.onclose = (event) => {
      console.error("socket@close", event);
      setTimeout(() => {
        console.log("SignalingChannel reconnecting...");
        this.connect(url);
      }, 2_000);
    };
    this.socket.onerror = (event) => {
      console.error("socket@error", event);
    };
  }
  send(type, payload = {}, target = null) {
    const message = JSON.stringify({ type, [type]: payload, target });
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(message);
    else this.upstream.push(message);
  }

  // EventEmitter mixin
  addEventListener(name, listener) {
    this.events.addEventListener(name, listener);
  }
  removeEventListener(name, listener) {
    this.events.removeEventListener(name, listener);
  }
}

class PeerConnection {
  /** @param {SignalingChannel} signaler */
  constructor(signaler, target, polite = false) {
    this.signaler = signaler;
    this.target = target;
    this.polite = polite;
    this.peer = new RTCPeerConnection(appOptions.rtc);
    this.makingOffer = false;
    this.ignoreOffer = false;

    this.onDescription = this.onDescription.bind(this);
    this.onCandidate = this.onCandidate.bind(this);

    this.peer.onnegotiationneeded = async (event) => {
      try {
        this.makingOffer = true;
        await this.peer.setLocalDescription();
        this.signaler.send(
          "description",
          this.peer.localDescription,
          this.target
        );
      } catch (error) {
        console.error(error);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peer.onicecandidate = (event) => {
      this.signaler.send("candidate", event.candidate, this.target);
    };
    this.peer.oniceconnectionstatechange = () => {
      if (this.peer.iceConnectionState === "failed") {
        this.peer.restartIce();
      }
    };

    this.signaler.addEventListener("description", this.onDescription);
    this.signaler.addEventListener("candidate", this.onCandidate);
  }
  close() {
    this.signaler.removeEventListener("description", this.onDescription);
    this.signaler.removeEventListener("candidate", this.onCandidate);
    this.peer.close();
  }

  async onDescription(payload, from) {
    if (from !== this.target) return;

    const offerCollision =
      payload.type === "offer" &&
      (this.makingOffer || this.peer.signalingState !== "stable");

    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    await this.peer.setRemoteDescription(payload);

    if (payload.type === "offer") {
      await this.peer.setLocalDescription();
      this.signaler.send(
        "description",
        this.peer.localDescription,
        this.target
      );
    }
  }
  async onCandidate(payload, from) {
    if (from !== this.target) return;

    try {
      await this.peer.addIceCandidate(payload);
    } catch (err) {
      if (!this.ignoreOffer) console.error(err);
    }
  }
}

// INFO :== { id, members }

export class Portal {
  events = new EventEmitter();
  /** @type {Map<string, PeerConnection} */ connections = new Map();

  /** @param {SignalingChannel} signaler */
  constructor(signaler) {
    this.signaler = signaler;

    this.onError = this.onError.bind(this);
    this.onInfo = this.onInfo.bind(this);

    this.signaler.addEventListener("error", this.onError);
    this.signaler.addEventListener("info", this.onInfo);
  }
  close() {
    for (const connection of this.connections.values()) connection.close();
    this.signaler.removeEventListener("error", this.onError);
    this.signaler.removeEventListener("info", this.onInfo);
  }

  onInfo(payload) {
    const activeIds = new Set();
    for (const member of payload.members) {
      activeIds.add(member.id);

      if (this.connections.has(member.id)) continue;

      const connection = new PeerConnection(
        this.signaler,
        member.id,
        member.polite
      );
      this.connections.set(member.id, connection);
      this.events.emit("connection", connection);
    }

    const lostIds = Array.from(this.connections.keys()).filter(
      (id) => !activeIds.has(id)
    );
    for (const id of lostIds) {
      const connection = this.connections.get(id);
      connection.close();
      this.connections.delete(id);
      this.events.emit("close", connection);
    }
  }
  onError(message) {
    this.close();
    this.events.emit("error", new Error(message));
  }

  // EventEmitter mixin
  addEventListener(name, listener) {
    this.events.addEventListener(name, listener);
  }
  removeEventListener(name, listener) {
    this.events.removeEventListener(name, listener);
  }
}
