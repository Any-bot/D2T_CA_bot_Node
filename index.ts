import { Client } from "discord.js-selfbot-v13";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import * as readline from "readline";
import dotenv from "dotenv";
import fs from "fs";
import {
  detectSolanaTokenAddress,
  saveAddress,
  loadTrackedAddresses,
  saveAddressDiscord,
  loadTrackedAddressesDiscord,
} from "./utils/utils";
import { NewMessage } from "telegram/events";
// import logger from "./utils/logger";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt function
function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Load environment variables
dotenv.config();

// Load config
function loadConfig() {
  return JSON.parse(fs.readFileSync("config.json", "utf8"));
}

const config = loadConfig();

// Access environment variables
const DISCORD_USER_TOKEN = process.env.DISCORD_USER_TOKEN;
const TELEGRAM_API_ID = parseInt(process.env.TELEGRAM_API_ID || "0");
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || "";

// Get settings from config
const BOT_USERNAME = config.telegram.bot_username;
const MONITORED_SERVERS = config.discord.server_channels;
const TARGET_TELEGRAM_CHANNELS = config.telegram.target_channels;

// Initialize Discord client
const discordClient = new Client();

// Initialize Telegram client
const telegramClient = new TelegramClient(
  new StringSession(""),
  TELEGRAM_API_ID,
  TELEGRAM_API_HASH,
  { connectionRetries: 5 }
);

// Discord event handlers
discordClient.on("ready", () => {
  // logger.info(`Logged in as ${discordClient.user?.tag}`);
  console.log(`Logged in as ${discordClient.user?.tag}`);
});

discordClient.on("messageCreate", async (message: any) => {
  try {
    const serverId = message.guild?.id.toString();
    const channelId = message.channel.id.toString();

    for (const serverConfig of MONITORED_SERVERS) {
      if (
        serverId in serverConfig &&
        serverConfig[serverId].includes(channelId)
      ) {
        // logger.info(`Detected message in ${serverConfig[serverId]}`);

        const solanaAddresses = await detectSolanaTokenAddress(message.content);
        // logger.info(`Detected Solana addresses: ${solanaAddresses}`);

        if (solanaAddresses.length > 0) {
          const addressMap = loadTrackedAddressesDiscord();
          // Process addresses sequentially
          for (const address of solanaAddresses) {
            // Check if address exists in Map before sending
            // if (!addressMap.has(address)) {
            if (addressMap.get(address) !== 1) {
              try {
                await telegramClient.sendMessage(BOT_USERNAME, {
                  message: address,
                });
                // logger.info(`Sent message for address: ${address}`);
                saveAddressDiscord(address);
                // Add delay between messages
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } catch (error) {
                // logger.error(
                //   `Failed to send message for address ${address}: ${error}`
                // );
                continue;
              }
            } else {
              // logger.info(`Skipping existing address: ${address}`);
            }
          }
        }
      }
    }
  } catch (error) {
    // logger.error(`Error processing message: ${error}`);
    // Don't exit process, just log the error and continue
  }
});

telegramClient.addEventHandler(async (event: any) => {
  try {
    if (event?.message?.message) {
      const messageText = event.message.message;
      // console.log(`1 Received message: ${messageText}`);
      const solanaAddresses = await detectSolanaTokenAddress(messageText);
      // console.log(`2 Detected Solana addresses: ${solanaAddresses}`);

      if (solanaAddresses.length > 0) {
        const addressMap = loadTrackedAddresses();
        // console.log(`3 Address map: ${addressMap}`);
        // Process each address individually
        for (const address of solanaAddresses) {
          // console.log(`4 Processing address: ${address}`);
          if (addressMap.get(address) !== 1) {
            // console.log(`5 Forwarding address: ${address}`);
            for (const targetChannel of TARGET_TELEGRAM_CHANNELS) {
              // console.log(`6 Forwarding to ${targetChannel}`);
              try {
                // console.log(`7 Sending message to ${targetChannel}`);
                await telegramClient.sendMessage(targetChannel, {
                  message: address, // Send just the address
                });
                // console.log(`8 CA ${address} forwarded to ${targetChannel}`);
                saveAddress(address);
                // console.log(`9 Saved new address: ${address}`);
                // console.log(
                //   "10 loadTrackedAddresses()",
                //   loadTrackedAddresses()
                // );
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } catch (error) {
                console.log(`11 Forward failed to ${targetChannel}:`, error);
              }
            }
          } else {
            console.log(`12 Address ${address} already tracked, skipping`);
          }
        }
      }
    }
  } catch (error) {
    console.log("Error processing Telegram message:", error);
  }
}, new NewMessage({}));

async function startTelegramClient() {
  try {
    console.log("Starting Telegram client...");
    await telegramClient.start({
      phoneNumber: async () =>
        await promptUser("Please enter your phone number: "),
      password: async () => await promptUser("Please enter your password: "),
      phoneCode: async () =>
        await promptUser("Please enter the code you received: "),
      onError: (err: any) => console.log(err),
    });
    // logger.info("📲 Telegram client started successfully");
  } catch (err: any) {
    console.error("Error starting Telegram client:", err);
    process.exit(1);
  }
}

async function startDiscordClient() {
  try {
    console.log("Starting Discord client... ");
    await discordClient.login(DISCORD_USER_TOKEN);
    // logger.info("🤖 Discord client started successfully");
  } catch (err: any) {
    console.error("Error starting Discord client:", err);
    process.exit(1);
  }
}

// Improve error handling in main function
async function main() {
  console.log("-------------------------> Starting bot...", Date.now());
  try {
    await startTelegramClient();
    await startDiscordClient(); // Make this await

    // Add process error handlers
    process.on("uncaughtException", (error) => {
      // logger.error("Uncaught Exception:", error);
    });

    process.on("unhandledRejection", (error) => {
      // logger.error("Unhandled Rejection:", error);
    });
  } catch (error) {
    // logger.error("Error in main:", error);
    process.exit(1);
  }
}

main();
