import { Portal, SignalingChannel } from "./portal.js";
import { getTarget } from "./lib.js";

/** @type {HTMLVideoElement} */
const video = document.getElementById("video");
video.muted = true;
video.autoplay = true;

async function main() {
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (!id) throw new Error("id not set");

  const target = await getTarget(id);

  const server = new URL("portal", url);
  server.protocol = server.protocol.replace(/^http/, "ws");

  const signaler = new SignalingChannel({ id, target: target.id, server });

  const portal = new Portal(signaler, target.action === "wait");

  const connection = await portal.start();

  const data = connection.createDataChannel("dms", { negotiated: false });
  video.addEventListener("click", () => data.send("click"));

  data.addEventListener("open", () => {
    console.log("data@open");

    data.send("hi");
  });
  connection.addEventListener("datachannel", (event) => {
    event.channel.addEventListener("message", (event) => {
      console.log("datachannel@data@message", event.data);
    });
  });
  data.addEventListener("message", (event) => {
    console.log("data@message", event.data);
  });

  const stream = await portal.getStream();
  for (const track of stream.getTracks()) {
    portal.peerConnection.addTrack(track, stream);
  }

  connection.addEventListener("track", (event) => {
    console.log("connection@track");
    event.track.onunmute = () => {
      if (video.srcObject) return;
      video.srcObject = event.streams[0];
      video.removeAttribute("aria-hidden");
    };
    event.track.onended = () => {
      console.log("track@ended");
    };
  });
  connection.addEventListener("iceconnectionstatechange", () => {
    if (connection.iceConnectionState === "disconnected") {
      video.srcObject = null;
      video.setAttribute("aria-hidden", "true");
    }
  });

  // connection.addEventListener("datachannel", (event) => {
  //   console.log("connection@datachannel", event);
  // });

  // connection.addEventListener("track", (event) => {
  //   console.log("connection@track", event);
  // });
}

main();

function onError(error) {
  console.error(error);
}

window.addEventListener("error", (e) => onError(e.error));
window.addEventListener("unhandledrejection", (e) => onError(e.reason));
