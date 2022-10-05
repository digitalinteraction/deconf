// import { debounce } from "./lib.js";

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
    url.searchParams.set("id", options.id);
    this.connect(url);
  }
  connect(url) {
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => {
      const { type, [type]: payload } = JSON.parse(event.data);
      console.debug("signaler@%s %O", type, payload);
      this.events.emit(type, payload);
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
  send(type, payload) {
    const message = JSON.stringify({ type, [type]: payload });
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
  constructor(signaler, polite = false) {
    this.signaler = signaler;
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
        this.signaler.send("description", this.peer.localDescription);
      } catch (error) {
        console.error(error);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peer.onicecandidate = (event) => {
      this.signaler.send("candidate", event.candidate);
    };
    this.peer.oniceconnectionstatechange = (event) => {
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

  async onDescription(payload) {
    const offerCollision =
      payload.type === "offer" &&
      (this.makingOffer || this.peer.signalingState !== "stable");

    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    await this.peer.setRemoteDescription(payload);

    if (payload.type === "offer") {
      await this.peer.setLocalDescription();
      this.signaler.send("description", this.peer.localDescription);
    }
  }
  async onCandidate(payload) {
    try {
      await this.peer.addIceCandidate(payload);
    } catch (err) {
      if (!this.ignoreOffer) console.error(err);
    }
  }
}

// INFO :== { id, target, action, polite }

export class Portal {
  /** @type {MediaStream} */ stream = null;
  events = new EventEmitter();
  info = null;
  /** @type {PeerConnection | null} */ connection = null;

  /** @param {SignalingChannel} signaler */
  constructor(signaler) {
    this.signaler = signaler;

    this.onAlreadyConnected = this.onAlreadyConnected.bind(this);
    this.onInfo = this.onInfo.bind(this);

    this.signaler.addEventListener("alreadyConnected", this.onAlreadyConnected);
    this.signaler.addEventListener("info", this.onInfo);
  }
  close() {
    this.connection?.close();
    this.signaler.removeEventListener(
      "alreadyConnected",
      this.onAlreadyConnected
    );
    this.signaler.removeEventListener("info", this.onInfo);
  }

  onInfo(payload) {
    if (this.info?.action === payload.action) return;

    if (payload.action === "wait" && this.connection) {
      this.connection.close();
      this.connection = null;
      this.events.emit("close");
    }
    if (payload.action === "call" && !this.connection) {
      this.connection = new PeerConnection(this.signaler, payload.polite);
      this.events.emit("connection", this.connection.peer);
    }

    this.info = payload;
  }
  onAlreadyConnected() {
    this.close();
    this.events.emit("error", new Error("Id already connected"));
  }

  // EventEmitter mixin
  addEventListener(name, listener) {
    this.events.addEventListener(name, listener);
  }
  removeEventListener(name, listener) {
    this.events.removeEventListener(name, listener);
  }
}
