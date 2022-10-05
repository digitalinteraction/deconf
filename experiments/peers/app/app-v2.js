import { Portal, SignalingChannel, options } from "./portal.js";

/** @type {HTMLVideoElement} */
const video = document.getElementById("video");
video.muted = true;
video.autoplay = true;

const title = document.getElementById("title");

/** @type {MediaStream | null} */
let mediaStream = null;

/** @return {Promise<MediaStream>} */
async function getStream() {
  if (mediaStream !== null) return mediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(options.userMedia);
    return mediaStream;
  } catch (error) {
    console.error(error.name, error.message);
    throw error;
  }
}

async function main() {
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (!id) throw new Error("id not set");

  const server = new URL("portal", url);
  server.protocol = server.protocol.replace(/^http/, "ws");

  const stream = await getStream();

  const signaler = new SignalingChannel({ id, server });
  const portal = new Portal(signaler);

  portal.addEventListener("connection", (connection) => {
    for (const track of stream.getTracks()) {
      connection.addTrack(track, stream);
    }

    connection.addEventListener("track", (event) => {
      console.log("connection@track");
      event.track.onunmute = () => setRemoteStream(event.streams[0]);
    });
  });

  portal.addEventListener("close", () => {
    setRemoteStream(null);
  });

  signaler.addEventListener("info", (payload) => {
    if (payload.action === "wait") title.textContent = "Waiting…";
    if (payload.action === "call") {
      title.textContent = payload.polite ? "Listening…" : "Calling…";
    }
  });

  // let dataOpen = false;
  // const data = connection.createDataChannel("dms", { negotiated: false });
  // video.addEventListener("click", () => {
  //   if (dataOpen) data.send("click");
  // });
  // data.addEventListener("open", () => {
  //   dataOpen = true;
  //   data.send("hello there");
  // });
  // connection.addEventListener("datachannel", (event) => {
  //   event.channel.addEventListener("message", (event) => {
  //     console.log("datachannel@data@message", event.data);
  //   });
  // });
  // data.addEventListener("message", (event) => {
  //   console.log("data@message", event.data);
  // });

  // const stream = await getStream();

  // portal.peerConnection.addEventListener("track", (event) => {
  //   console.log("connection@track");
  //   event.track.onunmute = () => setRemoteStream(event.streams[0]);
  //   event.track.onended = () => console.log("track@ended");
  // });
}

function setRemoteStream(stream) {
  if (stream) {
    // if (video.srcObject) return;
    video.srcObject = stream;
    video.removeAttribute("aria-hidden");
    title.setAttribute("aria-hidden", "true");
  } else {
    video.setAttribute("aria-hidden", "true");
    title.removeAttribute("aria-hidden");
  }
}

function onError(error) {
  title.textContent = "Error - " + error.message;
  console.error(error);
}

window.addEventListener("error", (e) => onError(e.error));
window.addEventListener("unhandledrejection", (e) => onError(e.reason));

main().catch((error) => onError(error));
