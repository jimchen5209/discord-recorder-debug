import { Client } from "@projectdysnomia/dysnomia"
import { Silence } from "./util/Silence"
import { appendFileSync, existsSync, mkdirSync } from 'fs';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN environment variable is not set.");
}

const channelId = process.env.DISCORD_VOICE_CHANNEL_ID;
if (!channelId) {
  throw new Error("DISCORD_VOICE_CHANNEL_ID environment variable is not set.");
}

const time = (new Date()).toISOString().replace(/[:.]/g, '-').slice(0, 19); // Format: YYYY-MM-DDTHH-MM-SS

if (!existsSync("./recordings")) {
  console.info("Creating recordings directory...");
  mkdirSync("./recordings", { recursive: true });
}

const client = new Client(token, {
  restMode: true,
  gateway: {
    intents: [
      "guilds",
      "guildIntegrations",
      "guildMessages",
      "guildVoiceStates",
      "guildMembers",
    ],
  },
});

client.once("ready", async () => {
  console.info(`Logged in as ${client.user.username} (${client.user.id})`);
  const voiceConnection = await client.joinVoiceChannel(channelId)
  if (voiceConnection !== undefined) {
    console.info('Connected, start recording...')
    voiceConnection.play(new Silence(), { format: 'opusPackets' })
    
    voiceConnection.receive('pcm').on('data', (data, user) => {
      // Save the audio data to a file
      if (user) {
        const filePath = `./recordings/${user}-${time}.pcm`;
        if (!existsSync(filePath)) {
          console.info(`Creating file for user ${user}...`);
        }

        appendFileSync(filePath, data);
      }
    })

    voiceConnection.on('error', (error) => {
      console.error("Voice connection error:", error);
    });
    voiceConnection.on('warn', (message) => {
      console.warn("Voice connection warning:", message);
    })
    voiceConnection.on('debug', (message) => {
      console.debug("Voice connection debug:", message);
    })
  }
});

client.on("warn", (message) => {
  console.warn("Warning:", message);
});

client.on("error", (error) => {
  console.error("Error:", error);
});

client.on("debug", (message) => {
  console.debug("Debug:", message);
});

process.on('SIGINT', () => {
  console.info("Received SIGINT. Cleaning up...");
  client.disconnect({});
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info("Received SIGTERM. Cleaning up...");
  client.disconnect({});
  process.exit(0);
});

client.connect();

