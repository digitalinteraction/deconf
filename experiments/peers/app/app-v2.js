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

  // const data = connection.createDataChannel("dms");

  // data.addEventListener("open", () => {
  //   console.log("data@open");

  //   data.send("hi");
  // });
  // data.addEventListener("message", (event) => {
  //   console.log("data@message", event.data);
  // });

  // this.peerConnection.ontrack = (event) => {
  //   console.log("pc@track");
  //   event.track.onunmute = () => {
  //     if (this.video.srcObject) return;
  //     this.video.srcObject = event.streams[0];
  //   };
  // };

  const stream = await portal.getStream();
  for (const track of stream.getTracks()) {
    portal.peerConnection.addTrack(track, stream);
  }

  connection.addEventListener("track", (event) => {
    console.log("connection@track");
    event.track.onunmute = () => {
      if (video.srcObject) return;
      video.srcObject = event.streams[0];
    };
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
