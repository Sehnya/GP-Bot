import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType, verifyKeyMiddleware, InteractionResponseFlags, MessageComponentTypes } from 'discord-interactions';
import { DiscordRequest } from './utils.js';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';

console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Set' : 'Not set');
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('PUBLIC_KEY:', process.env.PUBLIC_KEY ? 'Set' : 'Not set');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// Check if environment variables are set
if (!process.env.CLIENT_ID || !process.env.DISCORD_TOKEN || !process.env.PUBLIC_KEY) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

const activeGames = {}; // In-memory storage for active games

app.post('/interactions', bodyParser.raw({ type: 'application/json' }), verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data, id } = JSON.parse(req.body.toString()); // Parse type, data, and id from request body
  try {
    if (type === InteractionType.APPLICATION_COMMAND) {
      switch (data.name) {
        case 'test':
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'A wild message appeared' },
          });
        case 'ping':
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Pong!' },
          });
        case 'challenge':
          const context = req.body.context;
          const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
          const objectName = req.body.data.options[0].value;

          activeGames[id] = {
            id: userId,
            objectName,
          };

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Rock papers scissors challenge from <@${userId}>`,
              components: [
                {
                  type: 1, // ACTION_ROW
                  components: [
                    {
                      type: 2, // BUTTON
                      custom_id: `accept_button_${req.body.id}`,
                      label: 'Accept',
                      style: 1, // PRIMARY
                    },
                  ],
                },
              ],
            },
          });
        default:
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Unknown command' },
          });
      }
    } else if (type === InteractionType.MESSAGE_COMPONENT) {
      const componentId = data.custom_id;

      if (componentId.startsWith('accept_button_')) {
        const gameId = componentId.replace('accept_button_', '');
        const endpoint = `webhooks/${process.env.CLIENT_ID}/${req.body.token}/messages/${req.body.message.id}`;
        try {
          await res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'What is your object of choice?',
              flags: InteractionResponseFlags.EPHEMERAL,
              components: [
                {
                  type: MessageComponentTypes.ACTION_ROW,
                  components: [
                    {
                      type: MessageComponentTypes.STRING_SELECT,
                      custom_id: `select_choice_${gameId}`,
                      options: getShuffledOptions(),
                    },
                  ],
                },
              ],
            },
          });
          await DiscordRequest(endpoint, { method: 'DELETE' });
        } catch (err) {
          console.error('Error sending message:', err);
        }
      } else if (componentId.startsWith('select_choice_')) {
        const gameId = componentId.replace('select_choice_', '');

        if (activeGames[gameId]) {
          const context = req.body.context;
          const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
          const objectName = data.values[0];

          const resultStr = getResult(activeGames[gameId], {
            id: userId,
            objectName,
          });

          delete activeGames[gameId];
          const endpoint = `webhooks/${process.env.CLIENT_ID}/${req.body.token}/messages/${req.body.message.id}`;

          try {
            await res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: { content: resultStr },
            });
            await DiscordRequest(endpoint, {
              method: 'PATCH',
              body: {
                content: 'Nice choice ' + getRandomEmoji(),
                components: []
              }
            });
          } catch (err) {
            console.error('Error sending message:', err);
          }
        }
      }
      return;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);
  await createCommands(); // Ensure commands are created after server starts
});

async function createCommands() {
  const clientId = process.env.CLIENT_ID;
  const globalEndpoint = `applications/${clientId}/commands`;

  const commands = [
    {
      name: 'test',
      description: 'Just your average command',
      type: 1,
    },
    {
      name: 'ping',
      description: 'Responds with Pong!',
      type: 1,
    },
    {
      name: 'challenge',
      description: 'Challenge someone to a game of rock paper scissors',
      type: 1,
      options: [
        {
          name: 'object',
          description: 'Your object choice',
          type: 3, // STRING
          required: true,
          choices: [
            { name: 'Rock', value: 'rock' },
            { name: 'Paper', value: 'paper' },
            { name: 'Scissors', value: 'scissors' },
          ],
        },
      ],
    },
    // Add more commands here
  ];

  try {
    for (const command of commands) {
      const res = await DiscordRequest(globalEndpoint, {
        method: 'POST',
        body: command,
      });
      console.log(await res.json());
    }
  } catch (err) {
    console.error('Error installing commands: ', err);
  }
}

app.use(
  morgan('dev'),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);

function getShuffledOptions() {
  const options = [
    { label: 'Rock', value: 'rock' },
    { label: 'Paper', value: 'paper' },
    { label: 'Scissors', value: 'scissors' },
  ];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function getResult(game, userChoice) {
  const choices = ['rock', 'paper', 'scissors'];
  const userIndex = choices.indexOf(userChoice.objectName);
  const gameIndex = choices.indexOf(game.objectName);

  if (userIndex === gameIndex) {
    return 'It\'s a tie!';
  }

  if ((userIndex + 1) % 3 === gameIndex) {
    return `<@${game.id}> wins!`;
  } else {
    return `<@${userChoice.id}> wins!`;
  }
}

function getRandomEmoji() {
  const emojis = ['🎉', '😎', '👍', '👌', '🤘'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}
