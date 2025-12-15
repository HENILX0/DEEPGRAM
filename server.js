const WebSocket = require("ws");
const { createClient } = require("@deepgram/sdk");

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

wss.on("connection", async (client) => {
  console.log("ESP32 connected");

  const dgSocket = deepgram.listen.live({
    model: "nova",
    language: "en",
    encoding: "linear16",
    sample_rate: 16000,
    punctuate: false
  });

  dgSocket.on("transcript", (data) => {
    const text = data.channel.alternatives[0]?.transcript;
    if (!text) return;

    const lower = text.toLowerCase();
    console.log("Heard:", lower);

    if (lower.includes("led on")) {
      client.send("LED_ON");
    }
    if (lower.includes("led off")) {
      client.send("LED_OFF");
    }
  });

  client.on("message", (audio) => {
    dgSocket.send(audio);
  });

  client.on("close", () => {
    dgSocket.finish();
    console.log("ESP32 disconnected");
  });
});

console.log("Server running on port", PORT);

