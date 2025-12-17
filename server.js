import { createClient } from "@deepgram/sdk";
import { WebSocketServer } from "ws";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const wss = new WebSocketServer({ port: 10000 });

console.log("✅ WebSocket server running on port 10000");

wss.on("connection", (ws) => {
  console.log("🔌 ESP32 connected");

  const dgSocket = deepgram.listen.live({
    model: "nova-2",
    language: "en",
    smart_format: true,
  });

  dgSocket.on("transcript", (data) => {
    const transcript =
      data.channel?.alternatives?.[0]?.transcript;

    if (!transcript) return;

    console.log("🗣️ Heard:", transcript);

    const cmd = transcript.toLowerCase();

    if (cmd.includes("led on")) {
      ws.send("LED_ON");
    }

    if (cmd.includes("led off")) {
      ws.send("LED_OFF");
    }
  });

  ws.on("message", (audio) => {
    dgSocket.send(audio);
  });

  ws.on("close", () => {
    dgSocket.finish();
    console.log("❌ ESP32 disconnected");
  });
}); 
