import { brotli } from "jsr:@deno-library/compress";
import { createClient } from "npm:redis@^4.5";

const openSockets: Array<WebSocket> = [];

const redis = createClient({
  url: Deno.env.get("REDIS_URL"),
});
await redis.connect();

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

        await redis.set(
          `toprint:${theJSON.uuid.toString()}`,
          brotli.compress(JSON.stringify(theJSON))
        );

        openSockets.forEach((sock) => {
          console.log("Sent to a listening socket.")
          sock.send(JSON.stringify(theJSON));
        });
      } else {
        throw new Error();
      }
    } catch (e) {
      console.log(e);
      return new Response(
        JSON.stringify({
          message: "Sorry, I'm a picky eater. I only accept valid JSON! Thanks 😋"
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
    await poll(socket);
  });

  socket.addEventListener("message", async (event) => {
    const json = JSON.parse(event.data);
    if (json.action == "poll") {
      poll(socket);
    } else {
      await redis.del(`toprint:${json.uuid}`);
    }
  })

  return response;
});

async function poll(socket: WebSocket) {
  const keys = await redis.keys('toprint:*');
  for (const key of keys) {
    const value = await redis.get(key);
    socket.send((await brotli.uncompress(value)).toString());
    return;
  }
}
