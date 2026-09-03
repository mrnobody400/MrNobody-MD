import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} from "@whiskeysockets/baileys";

import express from "express";
import pino from "pino";

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// RENDER WEB SERVER
// ===============================
app.get("/", (req, res) => {
  res.send("MrNobody-MD is running ✅");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ===============================
// BOT SETTINGS
// ===============================
const prefix = ".";

let reconnecting = false;

// ===============================
// START BOT
// ===============================
async function startBot() {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("./session");

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.ubuntu("MrNobody-MD"),
      markOnlineOnConnect: false
    });

    // Save WhatsApp credentials
    sock.ev.on("creds.update", saveCreds);

    // ===============================
    // CONNECTION UPDATE
    // ===============================
    sock.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect }) => {

        console.log("📡 Connection status:", connection);

        // -------------------------------
        // CONNECTING
        // -------------------------------
        if (connection === "connecting") {
          console.log("🔄 Inaunganisha WhatsApp...");
        }

        // -------------------------------
        // OPEN
        // -------------------------------
        if (connection === "open") {
          console.log("");
          console.log("================================");
          console.log("✅ MRNOBODY-MD CONNECTED");
          console.log("🤖 Bot iko online!");
          console.log("================================");
          console.log("");
        }

        // -------------------------------
        // CLOSE
        // -------------------------------
        if (connection === "close") {

          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          console.log(
            "❌ Connection imefungwa. Status:",
            statusCode
          );

          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect && !reconnecting) {
            reconnecting = true;

            console.log("🔄 Inaunganisha tena...");

            setTimeout(async () => {
              reconnecting = false;
              await startBot();
            }, 5000);

          } else if (statusCode === DisconnectReason.loggedOut) {
            console.log("");
            console.log("🚪 WhatsApp ime-logout.");
            console.log("⚠️ Futa session kisha pair tena.");
            console.log("");
          }
        }
      }
    );

    // ===============================
    // PAIRING CODE
    // ===============================
    if (!state.creds.registered) {

      const phoneNumber = process.env.PAIRING_NUMBER;

      if (!phoneNumber) {

        console.log("");
        console.log("================================");
        console.log("⚠️ PAIRING_NUMBER HAIPO");
        console.log("================================");
        console.log("");

      } else {

        const cleanNumber =
          phoneNumber.replace(/[^0-9]/g, "");

        console.log("");
        console.log("================================");
        console.log("📱 Pairing number:", cleanNumber);
        console.log("⏳ Inaomba pairing code...");
        console.log("================================");
        console.log("");

        try {

          // Wait briefly for the socket to initialize
          await new Promise(resolve =>
            setTimeout(resolve, 5000)
          );

          const code =
            await sock.requestPairingCode(cleanNumber);

          console.log("");
          console.log("================================");
          console.log("🔐 MRNOBODY-MD PAIRING CODE");
          console.log("👉 CODE:", code);
          console.log("================================");
          console.log("");
          console.log(
            "📱 WhatsApp > Settings > Linked devices > Link a device"
          );
          console.log(
            "➡️ Link with phone number instead"
          );
          console.log("");

        } catch (error) {

          console.log("");
          console.log(
            "❌ Pairing code error:",
            error?.message || error
          );
          console.log("");

        }
      }
    }

    // ===============================
    // MESSAGES
    // ===============================
    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {

        try {

          const msg = messages[0];

          if (!msg) return;
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

          const args =
            text
              .slice(prefix.length)
              .trim()
              .split(/\s+/);

          const command =
            args.shift()?.toLowerCase();

          // ===============================
          // MENU
          // ===============================
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

            await sock.sendMessage(jid, {
              text: menu
            });
          }

          // ===============================
          // PING
          // ===============================
          else if (command === "ping") {

            await sock.sendMessage(jid, {
              text:
                "🏓 Pong!\n\n🤖 MrNobody-MD iko online ✅"
            });
          }

          // ===============================
          // ALIVE
          // ===============================
          else if (command === "alive") {

            await sock.sendMessage(jid, {
              text:
                "🟢 *MrNobody-MD iko hai!*\n\n⚡ Bot iko online na inafanya kazi."
            });
          }

          // ===============================
          // OWNER
          // ===============================
          else if (command === "owner") {

            await sock.sendMessage(jid, {
              text:
                "👑 *OWNER*\n\nMrNobody\n\n🤖 MrNobody-MD"
            });
          }

          // ===============================
          // RUNTIME
          // ===============================
          else if (command === "runtime") {

            const uptime =
              process.uptime();

            const hours =
              Math.floor(uptime / 3600);

            const minutes =
              Math.floor(
                (uptime % 3600) / 60
              );

            const seconds =
              Math.floor(uptime % 60);

            await sock.sendMessage(jid, {
              text:
                `⏱️ *BOT RUNTIME*\n\n${hours}h ${minutes}m ${seconds}s`
            });
          }

        } catch (error) {

          console.log(
            "❌ Message error:",
            error?.message || error
          );

        }
      }
    );

  } catch (error) {

    console.log("");
    console.log(
      "❌ BOT START ERROR:",
      error?.message || error
    );
    console.log("");

    setTimeout(() => {
      startBot();
    }, 5000);
  }
}

// ===============================
// START
// ===============================
startBot();
