import express from 'express';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';

app.get('/login', (req, res) => {
  res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (code) {
    try {
      const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
          scope: 'identify guilds',
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const oauthData = await oauthResult.json();
      console.log(oauthData);
      // Here you would typically store the access_token and refresh_token
      res.send('Authorization successful! You can close this window.');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error during authorization');
    }
  } else {
    res.status(400).send('No code provided');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));