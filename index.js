import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} from "@whiskeysockets/baileys";

import express from "express";
import pino from "pino";

const app = express();
const PORT = process.env.PORT || 10000;

// Render health server
app.get("/", (req, res) => {
  res.send("MrNobody-MD is running ✅");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

const prefix = ".";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("MrNobody-MD")
  });

  sock.ev.on("creds.update", saveCreds);

  // Pairing Code
  if (!sock.authState?.creds?.registered) {
    const phoneNumber = process.env.PAIRING_NUMBER;

    if (phoneNumber) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(
            phoneNumber.replace(/[^0-9]/g, "")
          );

          console.log("");
          console.log("================================");
          console.log("🔐 MRNOBODY-MD PAIRING CODE");
          console.log("👉 CODE:", code);
          console.log("================================");
          console.log("");
        } catch (error) {
          console.log("❌ Pairing code error:", error.message);
        }
      }, 3000);
    } else {
      console.log("⚠️ PAIRING_NUMBER haijawekwa.");
    }
  }

  // Connection
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ MrNobody-MD imeunganishwa na WhatsApp!");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Connection imefungwa.");

      if (shouldReconnect) {
        console.log("🔄 Inaunganisha tena...");
        startBot();
      } else {
        console.log("🚪 WhatsApp ime-logout. Pair tena.");
      }
    }
  });

  // Messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];

      if (!msg.message) return;
      if (msg.key.fromMe) return;

      const jid = msg.key.remoteJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        "";

      if (!text.startsWith(prefix)) return;

      const args = text.slice(prefix.length).trim().split(/\s+/);
      const command = args.shift()?.toLowerCase();

      // MENU
      if (command === "menu") {
        const menu = `
╭━━━━━━━━━━━━━━━━━━╮
┃   🤖 *MRNOBODY-MD* 🤖
╰━━━━━━━━━━━━━━━━━━╯

👤 *Owner:* MrNobody
⚡ *Prefix:* ${prefix}

╭───〔 📌 MAIN MENU 〕───
│
│ • .menu
│ • .ping
│ • .alive
│ • .owner
│ • .runtime
│
╰────────────────────

🔥 *MrNobody-MD*
💫 WhatsApp Multi Device Bot
`;

        await sock.sendMessage(jid, { text: menu });
      }

      // PING
      else if (command === "ping") {
        await sock.sendMessage(jid, {
          text: "🏓 Pong!\n\n🤖 MrNobody-MD iko online ✅"
        });
      }

      // ALIVE
      else if (command === "alive") {
        await sock.sendMessage(jid, {
          text: "🟢 *MrNobody-MD iko hai!*\n\n⚡ Bot iko online na inafanya kazi."
        });
      }

      // OWNER
      else if (command === "owner") {
        await sock.sendMessage(jid, {
          text: "👑 *OWNER*\n\nMrNobody\n\n🤖 MrNobody-MD"
        });
      }

      // RUNTIME
      else if (command === "runtime") {
        const uptime = process.uptime();

        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        await sock.sendMessage(jid, {
          text: `⏱️ *BOT RUNTIME*\n\n${hours}h ${minutes}m ${seconds}s`
        });
      }

    } catch (error) {
      console.log("❌ Message error:", error.message);
    }
  });
}

startBot();
