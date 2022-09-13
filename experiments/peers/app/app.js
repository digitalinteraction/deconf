const initialTitle = document.title;
const url = new URL(location.href);

async function main() {
  const id = url.searchParams.get("id");
  if (typeof id !== "string") throw new Error("id not set");
  document.title = `${id} | ${initialTitle}`;

  const target = await getTarget(id);
  console.debug("%s → %s", id, target);

  const peer = new Peer(id, {
    host: url.hostname,
    path: "/peerjs",
    port: url.port,
    proxied: true,
  });

  // for (let i = 0; i < 20; i++) {
  //   message(`Calling "${target}"`);
  //   const result = await call(peer, target);

  //   message(`Call over or failed (${result}), waiting 10s`);
  //   await new new Promise((resolve) => setTimeout(resolve, 10_000))();
  // }

  message(`Calling "${target.id}"`);
  const result = await call(peer, target);
  message(`Call ${result}, waiting 5s`);
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  // After so many tries, just reload the page
  location.reload();
}

/** @returns {Promise<{ id: string, index: number }>} */
async function getTarget(id) {
  const res = await fetch(`/api/pairs/${id}`);
  if (!res.ok) throw new Error("Pair not found");
  const peer = await res.json();
  return peer;
}

async function call(peer, target) {
  const connection = peer.connect(target.id);

  connection.on("data", (data) => {
    console.log("data", data);

    if (data === "ping") connection.send("pong");
  });

  console.log(connection);

  return new Promise((resolve) => {
    connection.on("open", (e) => {
      console.debug("opened");

      connection.send("ping");
    });

    connection.on("close", () => resolve("closed"));
    connection.on("disconnected", () => resolve("disconnected"));
    connection.on("error", (error) => {
      console.error(error);
      resolve("failed");
    });
  });
}

function message(message) {
  console.info(message);
}

main().catch((error) => {
  console.error(error);
  alert(error.message);
});
