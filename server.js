import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { WebSocketServer } from "ws";
import http from "http";

// ================= DEEPGRAM INIT =================
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// ================= HTTP SERVER ==================
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ESP32 Deepgram Voice Server Running");
});

// ================= WEBSOCKET ====================
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🔌 ESP32 connected");

  let dgReady = false;

  // -------- DEEPGRAM LIVE SOCKET --------
  const dgSocket = deepgram.listen.live({
    model: "nova-3",
    language: "en-US",
    smart_format: true,
    encoding: "linear16",
    sample_rate: 16000,
    interim_results: false
  });

  // When Deepgram is ready
  dgSocket.on(LiveTranscriptionEvents.Open, () => {
    dgReady = true;
    console.log("🟢 Deepgram Nova-3 connected");
  });

  // Receive transcript
  dgSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
    try {
      const transcript =
        data.channel?.alternatives?.[0]?.transcript;

      if (!transcript || !data.is_final) return;

      const cmd = transcript.toLowerCase();
      console.log("🗣️ Heard:", cmd);

      // ===== COMMANDS =====
      if (cmd.includes("led on")) {
        ws.send("led on");
        console.log("🚀 Sent: led on");
      }

      if (cmd.includes("led off")) {
        ws.send("led off");
        console.log("🚀 Sent: led off");
      }

    } catch (err) {
      console.error("Transcript parse error:", err);
    }
  });

  // Receive audio from ESP32
  ws.on("message", (audio) => {
    if (dgReady && dgSocket.getReadyState() === 1) {
      dgSocket.send(audio);
    }
  });

  // Cleanup
  ws.on("close", () => {
    console.log("❌ ESP32 disconnected");
    dgSocket.finish();
  });

  dgSocket.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("🔴 Deepgram Error:", err);
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
