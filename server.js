import { createClient } from "@deepgram/sdk";
import { WebSocketServer } from "ws";
import http from "http"; // Add this

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Create a standard HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Server is running");
});

// Attach WebSocket to the HTTP server
const wss = new WebSocketServer({ server });

// Use the PORT environment variable provided by Render (defaults to 10000)
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});

wss.on("connection", (ws) => {
  console.log("🔌 ESP32 connected");

  const dgSocket = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    smart_format: true,
  });

  // Open the Deepgram connection
  dgSocket.on("open", () => {
    console.log("🟢 Deepgram connection opened");
  });

  dgSocket.on("transcript", (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    console.log("🗣️ Heard:", transcript);
    const cmd = transcript.toLowerCase();

    // Match exactly what you check for in the ESP32 code
    if (cmd.includes("led on")) ws.send("led on");
    if (cmd.includes("led off")) ws.send("led off");
  });

  ws.on("message", (audio) => {
    if (dgSocket.getReadyState() === 1) { // Ensure Deepgram is ready
      dgSocket.send(audio);
    }
  });

  ws.on("close", () => {
    dgSocket.finish();
    console.log("❌ ESP32 disconnected");
  });

  dgSocket.on("error", (err) => {
    console.error("🔴 Deepgram Error:", err);
  });
});
