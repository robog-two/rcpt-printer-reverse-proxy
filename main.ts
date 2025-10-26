const openSockets = [];
const kv = await Deno.openKv();
import { brotli } from "jsr:@deno-library/compress";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.headers.get("upgrade") !== "websocket") {
    try {
      const theJSON = await req.json();
      if (theJSON && Object.entries(theJSON).length > 0) {
        theJSON.uuid = self.crypto.randomUUID();
        console.log(theJSON);

        await kv.set(
          ["toprint", theJSON.uuid.toString()],
          await brotli.compress(
            JSON.stringify(theJSON)
            )
            );

        openSockets.forEach((sock) => {
          console.log("Sent to a listening socket.")
          sock.send(JSON.stringify(theJSON));
        });
      } else {
        throw new Error();
      }
    } catch {
      return new Response(
        JSON.stringify({
          message: "Sorry, I'm a picky eater. I only accept JSON! Thanks 😋"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Your JSON was accepted (guy farting) 🧍‍♂️💨",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // WebSocket upgrade
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", async () => {
    openSockets.push(socket);

    poll(socket);
  });

  socket.addEventListener("message", async (event) => {
    const json = JSON.parse(event.data);
    if (json.action == "poll") {
      poll(socket);
    } else {
      await kv.delete(["toprint", json.uuid]);
    }
  })

  return response;
});

async function poll(socket) {
  const printQueue = kv.list({prefix: ["toprint"]});
  for await (let entry of printQueue) {
    socket.send((await brotli.uncompress(entry.value)).toString());
    return;
  }
}
