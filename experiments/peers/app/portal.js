import { debounce } from "./lib.js";

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server

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
  /** @type {string[]} */ upstream = [];
  /** @type {string[]} */ downstream = [];
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
      if (!this.onmessage) return this.downstream.push(message);

      for (const msg of this.downstream.concat(message)) {
        this.onmessage?.(msg.type, msg[msg.type]);
      }
      this.downstream = [];
    };
    this.socket.onopen = () => {
      for (const msg of this.upstream) this.socket.send(msg);
      this.upstream = [];
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
    else this.upstream.push(message);
  }
}

export class Portal {
  /** @type {MediaStream} */
  stream = null;

  /** @param {SignalingChannel} signaler */
  constructor(signaler, polite) {
    console.log("Portal polite=%o", polite);
    this.signaler = signaler;
    this.polite = polite;
    this.peerConnection = new RTCPeerConnection(options.rtc);
    this.makingOffer = false;
    this.ignoreOffer = false;
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

    this.peerConnection.onnegotiationneeded = async (event) => {
      try {
        this.makingOffer = true;
        await this.peerConnection.setLocalDescription();
        this.signaler.send("description", this.peerConnection.localDescription);
      } catch (error) {
        console.error(error);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peerConnection.onicecandidate = (event) => {
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
      if (this.peerConnection.iceConnectionState === "disconnected") {
        this.peerConnection.restartIce();
      }
    };

    const retry = debounce(2_000, () => {
      console.debug("retrying");
      this.peerConnection.restartIce();
    });

    setInterval(() => {
      console.log({
        iceGather: this.peerConnection.iceGatheringState,
        iceConnection: this.peerConnection.iceConnectionState,
        signal: this.peerConnection.signalingState,
      });
    }, 5_000);

    this.signaler.onmessage = async (type, payload) => {
      try {
        console.log("signaler@message type=%o", type);

        if (type === "description") {
          const offerCollision =
            payload.type === "offer" &&
            (this.makingOffer ||
              this.peerConnection.signalingState !== "stable");

          this.ignoreOffer = !this.polite && offerCollision;
          if (this.ignoreOffer) return;

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
            if (!this.ignoreOffer) throw err;
          }
        } else if (type === "notOnline") {
          retry();
        } else if (type === "polite") {
          console.log("polite=%o", payload);
          this.polite = payload;
        } else {
          console.error("Unknown message type=%o", type, payload);
        }
      } catch (error) {
        console.error("signaler@message", error);
      }
    };

    return this.peerConnection;
  }
}
