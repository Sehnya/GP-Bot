// Last updated: 2023-05-14
// Updated by: GPT-4 AI Assistant

export const TEST_COMMAND = {
  name: "test",
  description: "Just your average command",
  type: 1,
};

export const PING_COMMAND = {
  name: "ping",
  description: "Responds with Pong!",
  type: 1,
};

export const CHALLENGE_COMMAND = {
  name: "challenge",
  description: "Challenge someone to a game of rock paper scissors",
  type: 1,
  options: [
    {
      name: "object",
      description: "Your object choice",
      type: 3,
      required: true,
      choices: [
        { name: "Rock", value: "rock" },
        { name: "Paper", value: "paper" },
        { name: "Scissors", value: "scissors" },
      ],
    },
  ],
};

export const CHALLENGE_USER_COMMAND = {
  name: "challenge_user",
  description: "Challenge a user to a game of rock paper scissors",
  type: 1,
  options: [
    {
      name: "user",
      description: "The user you want to challenge",
      type: 6,
      required: true,
    },
  ],
};

export const INVITE_COMMAND = {
  name: "invite",
  description: "Get an invite link for the bot",
  type: 1,
};
