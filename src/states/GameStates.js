/**
 * Game States
 * 
 * Implements the State pattern for managing game flow.
 * Each state handles its own logic and transitions.
 * 
 * @module GameStates
 */

const GameConfig = require('../config/GameConfig');

/**
 * Base state class
 */
class GameState {
  constructor(game) {
    this.game = game;
  }

  async enter() {}
  async handle() {}
  async exit() {}
  getName() { return 'BaseState'; }
}

/**
 * Setup state - handles game initialization
 */
class SetupState extends GameState {
  getName() { return 'Setup'; }

  async enter() {
    console.log("\nLet's play Sea Battle!");
    console.log('Try to sink the 3 enemy ships.');
  }

  async handle() {
    this.game.setState(new PlayerTurnState(this.game));
    return { continue: true };
  }
}

/**
 * Player turn state - handles player moves
 */
class PlayerTurnState extends GameState {
  getName() { return 'PlayerTurn'; }

  async enter() {
    this.game.displayBoards();
  }

  async handle() {
    try {
      const input = await this.game.requestPlayerInput();
      const result = await this.game.processPlayerMove(input);

      if (!result.success) {
        console.log(result.error);
        return { continue: true };
      }

      if (result.hit) {
        console.log('PLAYER HIT!');
        if (result.sunk) {
          console.log('You sunk an enemy battleship!');
          if (this.game.cpuNumShips === 0) {
            this.game.setState(new GameOverState(this.game, 'player'));
            return { continue: false, winner: 'player' };
          }
        }
      } else {
        console.log('PLAYER MISS.');
      }

      this.game.setState(new CPUTurnState(this.game));
      return { continue: true };
    } catch (error) {
      console.error('Error during player turn:', error);
      this.game.setState(new GameOverState(this.game, 'error'));
      return { continue: false, error: error.message };
    }
  }
}

/**
 * CPU turn state - handles CPU moves
 */
class CPUTurnState extends GameState {
  getName() { return 'CPUTurn'; }

  async enter() {
    console.log('\nCPU is thinking...');
  }

  async handle() {
    try {
      const result = await this.game.processCPUMove();

      if (result.hit) {
        console.log(`CPU HIT at ${result.coordinate}!`);
        if (result.sunk) {
          console.log('CPU sunk one of your battleships!');
          if (this.game.playerNumShips === 0) {
            this.game.setState(new GameOverState(this.game, 'cpu'));
            return { continue: false, winner: 'cpu' };
          }
        }
      } else {
        console.log(`CPU MISS at ${result.coordinate}.`);
      }

      this.game.setState(new PlayerTurnState(this.game));
      return { continue: true };
    } catch (error) {
      console.error('Error during CPU turn:', error);
      this.game.setState(new GameOverState(this.game, 'error'));
      return { continue: false, error: error.message };
    }
  }
}

/**
 * Game over state - handles end game
 */
class GameOverState extends GameState {
  constructor(game, winner) {
    super(game);
    this.winner = winner;
  }

  getName() { return 'GameOver'; }

  async enter() {
    this.game.displayBoards();
  }

  async handle() {
    if (this.winner === 'player') {
      console.log('\n*** CONGRATULATIONS! You sunk all enemy battleships! ***');
    } else if (this.winner === 'cpu') {
      console.log('\n*** GAME OVER! The CPU sunk all your battleships! ***');
    } else {
      console.log('\n*** GAME ENDED DUE TO AN ERROR ***');
    }

    // Display final stats
    const stats = this.game.getGameStatus();
    console.log('\nGame Statistics:');
    console.log(`Total Turns: ${stats.totalTurns}`);
    console.log(`Player Moves: ${stats.playerMoves}`);
    console.log(`CPU Moves: ${stats.cpuMoves}`);

    this.game.endGame(this.winner);
    return { continue: false, winner: this.winner };
  }
}

module.exports = {
  SetupState,
  PlayerTurnState,
  CPUTurnState,
  GameOverState
}; 