import { debounce } from "./lib.js";

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels

const options = {
  /** @type {RTCConfiguration} */
  rtc: {
    iceServers: [
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  },
  /** @type {MediaStreamConstraints} */
  userMedia: {
    video: { width: 1920, height: 1080 },
  },
};

/** @typedef {{ id: string, target: string, server: URL }} PortalOptions */

export class SignalingChannel {
  /** @type {string[]} */ messages = [];
  /** @type {null | (event: MessageEvent) => void} */ onmessage = null;
  /** @type {WebSocket} */ socket = null;

  /** @param {PortalOptions} options */
  constructor(options) {
    console.log("SignalingChannel", options);
    this.target = options.target;
    const url = new URL(options.server);
    url.searchParams.set("id", options.id);
    this.connect(url);
  }
  connect(url) {
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.onmessage?.(message.type, message[message.type]);
    };
    this.socket.onopen = () => {
      for (const msg of this.messages) this.socket.send(msg);
      this.messages = [];
    };
    this.socket.onerror = (event) => {
      console.error("socket@error", event);
      setTimeout(() => {
        console.log("reconnecting...");
        this.connect(url);
      }, 2_000);
    };
  }
  send(type, payload) {
    const message = JSON.stringify({
      type,
      [type]: payload,
      target: this.target,
    });
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(message);
    else this.messages.push(message);
  }
}

export class Portal {
  /** @type {MediaStream} */
  stream = null;

  /** @param {SignalingChannel} signaler */
  constructor(signaler, polite, cb) {
    console.log("Portal polite=%o", polite);
    this.signaler = signaler;
    this.polite = polite;
    this.peerConnection = new RTCPeerConnection(options.rtc);
    this.cb = cb;
  }

  /** @return {Promise<MediaStream>} */
  async getStream() {
    if (this.stream !== null) return stream;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(
        options.userMedia
      );
      return this.stream;
    } catch (error) {
      console.error(error.name, error.message);
      throw error;
    }
  }

  async start() {
    // const stream = await this.getStream();
    // for (const track of stream.getTracks()) {
    //   this.peerConnection.addTrack(track, stream);
    // }

    let makingOffer = false;
    this.peerConnection.onnegotiationneeded = async (event) => {
      try {
        makingOffer = true;
        await this.peerConnection.setLocalDescription();
        this.signaler.send("description", this.peerConnection.localDescription);
      } catch (error) {
        console.error(error);
      } finally {
        makingOffer = false;
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      console.log("pc@icecandidate");
      this.signaler.send("candidate", event.candidate);
    };

    this.peerConnection.oniceconnectionstatechange = (event) => {
      console.log(
        "peerConnection@icestate",
        this.peerConnection.iceConnectionState
      );
      if (this.peerConnection.iceConnectionState === "failed") {
        this.peerConnection.restartIce();
      }
    };

    const retry = debounce(2_000, () => {
      console.debug("retrying");
    });

    let ignoreOffer = false;
    this.signaler.onmessage = async (type, payload) => {
      console.log("signaler@message type=%o", type);

      if (type === "description") {
        const offerCollision =
          payload.type === "offer" &&
          (makingOffer || this.peerConnection.signalingState !== "stable");

        ignoreOffer = !this.polite && offerCollision;
        if (ignoreOffer) return;

        await this.peerConnection.setRemoteDescription(payload);

        if (payload.type === "offer") {
          await this.peerConnection.setLocalDescription();
          this.signaler.send(
            "description",
            this.peerConnection.localDescription
          );
        }
      } else if (type === "candidate") {
        try {
          await this.peerConnection.addIceCandidate(payload);
        } catch (err) {
          if (!ignoreOffer) throw err;
        }
      } else if (type === "notOnline") {
        retry();
      } else {
        console.error("Unknown message type=%o", type, payload);
      }
    };

    return this.peerConnection;
  }
}
