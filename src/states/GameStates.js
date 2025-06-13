/**
 * Game States - State Pattern Implementation
 * 
 * Manages game flow through different states.
 * Implements State pattern for clean state transitions.
 * 
 * @module GameStates
 */

/**
 * Abstract base class for game states
 */
class GameState {
  constructor(game) {
    this.game = game;
  }

  enter() {}
  handle() {}
  exit() {}
  getName() {
    return this.constructor.name;
  }
}

/**
 * Setup state - Initial game setup and ship placement
 */
class SetupState extends GameState {
  async enter() {
    console.log('\nLet\'s play Sea Battle!');
    console.log('Try to sink the 3 enemy ships.');
  }

  async handle() {
    this.game.setState(new PlayerTurnState(this.game));
    await this.game.currentState.handle();
  }
}

/**
 * Player turn state - Handle player moves
 */
class PlayerTurnState extends GameState {
  async handle() {
    try {
      // Display current board state
      this.game.displayBoards();

      // Get player input
      const input = await this.game.requestPlayerInput();
      const result = await this.game.processPlayerMove(input);

      if (!result.success) {
        console.log(result.error);
        return this.handle();
      }

      if (result.hit) {
        console.log('PLAYER HIT!');
        if (result.sunk) {
          console.log('You sunk an enemy battleship!');
        }
      } else {
        console.log('PLAYER MISS.');
      }

      // Check for game over
      if (this.game.cpuNumShips === 0) {
        this.game.setState(new GameOverState(this.game, 'player'));
        await this.game.currentState.handle();
        return;
      }

      // Switch to CPU turn
      this.game.setState(new CPUTurnState(this.game));
      await this.game.currentState.handle();
    } catch (error) {
      console.error('Error during player turn:', error);
      this.game.setState(new GameOverState(this.game, 'error'));
      await this.game.currentState.handle();
    }
  }
}

/**
 * CPU turn state - Handle CPU moves
 */
class CPUTurnState extends GameState {
  async handle() {
    try {
      console.log('\nCPU is thinking...');
      const result = await this.game.processCPUMove();
      
      if (result.hit) {
        console.log(`CPU HIT at ${result.coordinate}!`);
        if (result.sunk) {
          console.log('CPU sunk your battleship!');
        }
      } else {
        console.log(`CPU MISS at ${result.coordinate}.`);
      }

      // Check for game over
      if (this.game.playerNumShips === 0) {
        this.game.setState(new GameOverState(this.game, 'cpu'));
        await this.game.currentState.handle();
        return;
      }

      // Switch back to player turn
      this.game.setState(new PlayerTurnState(this.game));
      await this.game.currentState.handle();
    } catch (error) {
      console.error('Error during CPU turn:', error);
      this.game.setState(new GameOverState(this.game, 'error'));
      await this.game.currentState.handle();
    }
  }
}

/**
 * Game over state - Handle end game conditions
 */
class GameOverState extends GameState {
  constructor(game, winner) {
    super(game);
    this.winner = winner;
  }

  async handle() {
    this.game.displayBoards();
    
    switch (this.winner) {
      case 'player':
        console.log('\n*** CONGRATULATIONS! You sunk all enemy battleships! ***');
        break;
      case 'cpu':
        console.log('\n*** GAME OVER! The CPU sunk all your battleships! ***');
        break;
      default:
        console.log('\n*** Game ended due to an error ***');
    }

    // Display final stats
    const stats = this.game.getGameStatus();
    console.log('\nGame Statistics:');
    console.log(`Total Turns: ${stats.totalTurns}`);
    console.log(`Player Moves: ${stats.playerMoves}`);
    console.log(`CPU Moves: ${stats.cpuMoves}`);
    
    this.game.endGame(this.winner);
  }
}

module.exports = {
  SetupState,
  PlayerTurnState,
  CPUTurnState,
  GameOverState
}; 