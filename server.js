import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { WebSocketServer } from "ws";
import http from "http";

// Initialize Deepgram with your API Key (loaded from Render Environment Variables)
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Create a standard HTTP server for Render health checks
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Nova-3 Voice Server is Active");
});

// Attach WebSocket to the HTTP server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🔌 ESP32 connected to Render");

  // Configure the Live Transcription for Nova-3
  const dgSocket = deepgram.listen.live({
    model: "nova-3",          // 🔥 Using Nova-3 as requested
    language: "en-US",
    smart_format: true,
    encoding: "linear16",    // Matches ESP32 16-bit PCM
    sample_rate: 16000,      // Matches ESP32 I2S setting
  });

  // Event: Deepgram connection is ready
  dgSocket.on(LiveTranscriptionEvents.Open, () => {
    console.log("🟢 Deepgram Nova-3 connection opened");
  });

  // Event: Deepgram sends back text
  dgSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
    // Navigate the 2025 JSON structure for Nova-3
    const transcript = data.channel.alternatives[0].transcript;
    
    // Only process if there is actual text and it is a "final" result
    if (transcript && data.is_final) {
      console.log("🗣️ Heard:", transcript);
      const cmd = transcript.toLowerCase();

      // Logic to send simple text commands back to ESP32
      if (cmd.includes("led on")) {
        ws.send("led on");
        console.log("🚀 Command Sent: ON");
      }
      if (cmd.includes("led off")) {
        ws.send("led off");
        console.log("🚀 Command Sent: OFF");
      }
    }
  });

  // Receive binary audio from ESP32 and push to Deepgram
  ws.on("message", (audio) => {
    if (dgSocket.getReadyState() === 1) { 
      dgSocket.send(audio);
    }
  });

  // Handle errors
  dgSocket.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("🔴 Deepgram Socket Error:", err);
  });

  ws.on("close", () => {
    dgSocket.finish();
    console.log("❌ ESP32 disconnected");
  });
});

// Listen on the port Render provides
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
