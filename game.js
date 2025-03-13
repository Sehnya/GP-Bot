import { capitalize } from "./utils.js";

const CHOICES = ["rock", "paper", "scissors"];

// Function to determine the result of Rock, Paper, Scissors
// UPDATED TO: Implemented the getResult function to determine the winner of Rock, Paper, Scissors
export function getResult(choice1, choice2) {
  const outcomes = {
    rock: { beats: "scissors" },
    paper: { beats: "rock" },
    scissors: { beats: "paper" },
  };

  if (!outcomes[choice1] || !outcomes[choice2]) {
    throw new Error("Invalid choice");
  }

  if (choice1 === choice2) {
    return "It's a tie!";
  }

  if (outcomes[choice1].beats === choice2) {
    return "You win!";
  } else {
    return "You lose!";
  }
}

// Function to get shuffled options for Rock, Paper, Scissors
// UPDATED TO: Added function to get shuffled options
export function getShuffledOptions() {
  const options = ["rock", "paper", "scissors"];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
