import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType, verifyKeyMiddleware } from 'discord-interactions';
import { DiscordRequest } from './utils.js';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Set' : 'Not set');
console.log('APP_ID:', process.env.APP_ID);
console.log('PUBLIC_KEY:', process.env.PUBLIC_KEY ? 'Set' : 'Not set');
// Create and configure express app
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), function (req, res) {
  const { type, data } = req.body; // Parse type and data from request body
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
        // Add more commands here
        default:
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Unknown command' },
          });
      }
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
  const appId = process.env.APP_ID;
  const globalEndpoint = `applications/${appId}/commands`;

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
