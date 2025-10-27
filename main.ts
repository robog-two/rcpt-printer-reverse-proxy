let printSocket: WebSocket | undefined = undefined;
let uuidReturned: string | undefined = undefined;

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
    if (printSocket) {
      try {
        const theJSON = await req.json();
        if (theJSON && Object.entries(theJSON).length > 0) {
          theJSON.uuid = self.crypto.randomUUID().toString();
          console.log(theJSON);

          printSocket?.send(JSON.stringify(theJSON));

          const now = performance.now();
          while (performance.now() - now < 3000000) {
            if (uuidReturned == theJSON.uuid) {
              return new Response(
                JSON.stringify({
                  message: "Your JSON was accepted (guy farting) 🧍‍♂️💨",
                }),
                {
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
          }
        } else {
          throw new Error();
        }
      } catch {
        return new Response(
          JSON.stringify({
            message: "Sorry, I'm a picky eater. I only accept JSON! Thanks 😋",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        message:
          "Unable to connect to receipt printer 👻 it's probably unplugged, email me",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  // WebSocket upgrade
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    if (socket) {
      return new Response("Not authorized", { status: 401 });
    } else {
      printSocket = socket;
    }
  });

  socket.addEventListener("message", (event) => {
    const json = JSON.parse(event.data);
    uuidReturned = json.uuid;
  });

  return response;
});
