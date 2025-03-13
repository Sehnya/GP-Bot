import "dotenv/config";
import fetch from "node-fetch";

// Function to make a Discord API request
// UPDATED TO: Added logging to capture the response body for debugging
export async function DiscordRequest(endpoint, options) {
  const url = `https://discord.com/api/v9/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseBody = await res.json();

  if (!res.ok) {
    console.error(
      `Error with Discord API request: ${res.status}`,
      responseBody
    );
    throw new Error(`Discord API request failed with status ${res.status}`);
  }

  return responseBody;
}

export async function InstallGlobalCommands(appId, commands) {
  const endpoint = `applications/${appId}/commands`;
  try {
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
  } catch (error) {
    console.error("Error installing commands:", error);
    throw error;
  }
}

// Function to get a random emoji
// UPDATED TO: Added function to get a random emoji
export function getRandomEmoji() {
  const emojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇"];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
