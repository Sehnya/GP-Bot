import "dotenv/config";
import express from "express";
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from "discord-interactions";
import { Client, GatewayIntentBits } from "discord.js";
import { getResult } from "./game.js";
import { getRandomEmoji, DiscordRequest } from "./utils.js";
import bodyParser from "body-parser";

// Function to generate the bot's invite URL
// UPDATED TO: Added function to generate the bot's invite URL
function getInviteUrl() {
  const scopes = ["bot", "applications.commands"];
  const permissions = "2147483648"; // Default permissions, adjust as needed

  return `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=${scopes.join(
    "%20"
  )}`;
}

// Environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT || 3001;
const REDIRECT_URI = `http://localhost:3001/callback`;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const app = express();

// Middleware to parse JSON bodies, but exclude interaction routes
// UPDATED TO: Added middleware to parse JSON bodies, but exclude interaction routes
app.use((req, res, next) => {
  if (req.path === "/interactions") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

// Root route handler
// UPDATED TO: Added root route handler
app.get("/", (req, res) => {
  res.send("GP Bot is running! Use Discord to interact with the bot.");
});

// Check if required environment variables are set
// UPDATED TO: Added check for required environment variables
if (!CLIENT_ID || !CLIENT_SECRET || !DISCORD_TOKEN || !PUBLIC_KEY) {
  console.error(
    "Missing required environment variables. Please check your .env file."
  );
  process.exit(1);
}

// Discord.js client setup
// UPDATED TO: Added Discord.js client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handler for when the bot is ready
// UPDATED TO: Added event handler for when the bot is ready
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Event handler for message creation
// UPDATED TO: Added event handler for message creation
client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.reply("Pong!");
  }
});

// Route to initiate Discord OAuth2 login
// UPDATED TO: Added route to initiate Discord OAuth2 login
app.get("/login", (_req, res) => {
  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.append("client_id", CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "bot applications.commands");

  console.log("Redirecting to:", authUrl.toString());
  res.redirect(authUrl.toString());
});

// OAuth2 callback route
// UPDATED TO: Added OAuth2 callback route
app.get("/callback", async (req, res) => {
  const { code } = req.query;
  console.log("Received code:", code);

  if (code) {
    try {
      const tokenResponse = await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const oauthData = await tokenResponse.json();
      console.log("OAuth response:", oauthData);

      if (oauthData.access_token) {
        res.send(
          "Bot has been added to the server! You can close this window."
        );
      } else {
        console.error("OAuth error:", oauthData);
        res
          .status(400)
          .send("Failed to get access token: " + JSON.stringify(oauthData));
      }
    } catch (error) {
      console.error("Error during authorization:", error);
      res.status(500).send("Error during authorization: " + error.message);
    }
  } else {
    res.status(400).send("No code provided");
  }
});

// Function to create commands for the bot
// UPDATED TO: Added function to create commands for the bot
async function createCommands() {
  const globalEndpoint = `applications/${CLIENT_ID}/commands`;

  const commands = [
    {
      name: "test",
      description: "Just your average command",
      type: 1,
    },
    {
      name: "ping",
      description: "Responds with Pong!",
      type: 1,
    },
    {
      name: "challenge",
      description: "Challenge someone to a game of rock paper scissors",
      type: 1,
      options: [
        {
          name: "object",
          description: "Your object choice",
          type: 3, // STRING
          required: true,
          choices: [
            { name: "Rock", value: "rock" },
            { name: "Paper", value: "paper" },
            { name: "Scissors", value: "scissors" },
          ],
        },
      ],
    },
    {
      name: "challenge_user",
      description: "Challenge a user to a game of rock paper scissors",
      type: 1,
      options: [
        {
          name: "user",
          description: "The user you want to challenge",
          type: 6, // USER
          required: true,
        },
      ],
    },
    {
      name: "emoji",
      description: "Get a random emoji",
      type: 1,
    },
  ];

  const inviteCommand = {
    name: "invite",
    description: "Get the invite link for the bot",
    type: 1,
  };

  commands.push(inviteCommand);
  try {
    for (const command of commands) {
      const res = await DiscordRequest(globalEndpoint, {
        method: "POST",
        body: JSON.stringify(command),
      });
      console.log(res);
    }
  } catch (err) {
    console.error("Error installing commands: ", err);
  }
}

// Function to start the server
// UPDATED TO: Added function to start the server
const startServer = (port) => {
  return new Promise((resolve, reject) => {
    const server = app
      .listen(port)
      .on("listening", async () => {
        const address = server.address();
        console.log(`Server is now listening on port ${address.port}`);
        // Login to Discord with your client's token
        client.login(DISCORD_TOKEN);
        await createCommands();
        resolve(server);
      })
      .on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.log(
            `Port ${port} is already in use. Trying the next port...`
          );
          server.close();
          startServer(port + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(err);
        }
      });
  });
};

// Start the server
// UPDATED TO: Added code to start the server
startServer(PORT)
  .then(() => {
    console.log("Server started successfully");
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

// Store for in-progress games. In production, you'd want to use a DB
// UPDATED TO: Added store for in-progress games
const activeGames = {};

// Route to handle interactions from Discord
// UPDATED TO: Added route to handle interactions from Discord
app.post(
  "/interactions",
  express.raw({ type: "application/json" }), // Use raw buffer for interaction routes
  verifyKeyMiddleware(PUBLIC_KEY),
  async (req, res) => {
    let parsedBody;
    try {
      parsedBody = JSON.parse(req.body.toString("utf8"));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return res.status(400).send("Invalid request body");
    }

    const { type, data, member } = parsedBody;

    if (type === InteractionType.APPLICATION_COMMAND) {
      switch (data.name) {
        case "test":
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "A wild message appeared" },
          });
        case "ping":
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "Pong!" },
          });
        case "challenge":
          const userChoice = data.options[0].value.toLowerCase();
          const validChoices = ["rock", "paper", "scissors"];
          if (!validChoices.includes(userChoice)) {
            return res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content:
                  "Invalid choice. Please choose rock, paper, or scissors.",
              },
            });
          }
          // Implement the challenge logic here
          const botChoice =
            validChoices[Math.floor(Math.random() * validChoices.length)];
          const result = getResult(userChoice, botChoice);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `You chose ${userChoice}, I chose ${botChoice}. ${result}`,
            },
          });
        case "challenge_user":
          const challengedUserId = data.options[0].value;
          const challengerId = member.user.id;
          activeGames[challengerId] = {
            challengedUserId,
            challengerChoice: null,
            challengedChoice: null,
          };

          // Send a private message to the challenged user
          client.users.fetch(challengedUserId).then((user) => {
            user.send({
              content: `You have been challenged to a game of Rock, Paper, Scissors by <@${challengerId}>! Please choose your move:`,
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 3,
                      custom_id: "rps_choice",
                      options: [
                        { label: "Rock", value: "rock" },
                        { label: "Paper", value: "paper" },
                        { label: "Scissors", value: "scissors" },
                      ],
                      placeholder: "Choose your move",
                    },
                  ],
                },
              ],
            });
          });

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `Challenge sent to <@${challengedUserId}>!` },
          });
        case "invite":
          const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=2048&scope=bot%20applications.commands`;
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `You can invite the bot using this link: ${inviteUrl}`,
            },
          });
        case "emoji":
          const emoji = getRandomEmoji();
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `Here is a random emoji: ${emoji}` },
          });
        default:
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "Unknown command" },
          });
      }
    } else if (type === InteractionType.MESSAGE_COMPONENT) {
      const { custom_id, values, user } = data;
      if (custom_id === "rps_choice") {
        const userId = user.id;
        const game = Object.values(activeGames).find(
          (game) =>
            game.challengedUserId === userId || game.challengerId === userId
        );

        if (!game) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "No active game found." },
          });
        }

        if (game.challengerId === userId) {
          game.challengerChoice = values[0];
        } else if (game.challengedUserId === userId) {
          game.challengedChoice = values[0];
        }

        if (game.challengerChoice && game.challengedChoice) {
          const result = getResult(
            game.challengerChoice,
            game.challengedChoice
          );
          const challengerUser = await client.users.fetch(game.challengerId);
          const challengedUser = await client.users.fetch(
            game.challengedUserId
          );

          // Send the result to both users
          await challengerUser.send(
            `You chose ${game.challengerChoice}, <@${game.challengedUserId}> chose ${game.challengedChoice}. ${result}`
          );
          await challengedUser.send(
            `You chose ${game.challengedChoice}, <@${game.challengerId}> chose ${game.challengerChoice}. ${result}`
          );

          // Clean up the game
          delete activeGames[game.challengerId];
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Your choice has been recorded." },
        });
      }
    }
  }
);
