/**
 * Game States - State Pattern Implementation
 * 
 * Manages different game states and their transitions.
 * Implements State pattern for clean state management.
 * 
 * @module GameStates
 */

const GameConfig = require('../config/GameConfig');
const Ship = require('../entities/Ship');

/**
 * Abstract base class for game states
 */
class GameState {
  /**
   * Create a new game state
   * @param {Game} game - Game object
   */
  constructor(game) {
    if (!game) {
      throw new Error('Game object is required');
    }
    this.game = game;
  }
  
  /**
   * Handle state-specific behavior
   */
  handle() {
    throw new Error('GameState must implement handle method');
  }

  /**
   * Get state name for debugging
   * @returns {string} State name
   */
  getName() {
    return this.constructor.name;
  }

  enter() {}
  exit() {}
  handleInput() {}
}

/**
 * State when game is actively being played
 */
class PlayingState extends GameState {
  /**
   * Handle playing state - display boards and request input
   */
  handle() {
    this.game.displayBoards();
    this.game.requestPlayerInput();
    return { continue: true };
  }

  /**
   * Check if state should transition
   * @returns {GameState|null} New state or null to stay in current state
   */
  checkTransition() {
    if (this.game.cpuNumShips === 0) {
      return new GameOverState(this.game, 'player');
    }
    if (this.game.playerNumShips === 0) {
      return new GameOverState(this.game, 'cpu');
    }
    return null;
  }
}

/**
 * State when game has ended
 */
class GameOverState extends GameState {
  /**
   * Create game over state
   * @param {Game} game - Game object
   * @param {string} winner - Winner ('player' or 'cpu')
   */
  constructor(game, winner) {
    super(game);
    this.winner = winner;
  }
  
  /**
   * Handle game over state - display winner and end game
   */
  handle() {
    this.game.displayBoards();
    this.game.endGame();
    return { continue: false, winner: this.winner };
  }

  /**
   * Get game over information
   * @returns {Object} Game over details
   */
  getGameOverInfo() {
    return {
      winner: this.winner,
      endTime: new Date(),
      state: 'GameOver'
    };
  }

  enter() {
    this.game.notify('gameOver', { winner: this.winner });
  }

  handleInput(command) {
    switch (command) {
      case 'restart':
        this.game.setState(new SetupState(this.game));
        break;
      case 'quit':
        this.game.quit();
        break;
      default:
        this.game.notify('error', { message: 'Invalid command in GameOver state' });
    }
  }
}

/**
 * State when game is initializing
 */
class InitializationState extends GameState {
  constructor(game) {
    super(game);
  }
  
  /**
   * Handle initialization - set up boards and ships
   */
  handle() {
    try {
      if (this.game.playerBoard && this.game.playerBoard.reset) {
        this.game.playerBoard.reset();
      }
      if (this.game.cpuBoard && this.game.cpuBoard.reset) {
        this.game.cpuBoard.reset();
      }
      
      this.game.initializeGame();
      this.game.setState(new PlayerTurnState(this.game));
      return { continue: true };
    } catch (error) {
      this.game.setState(new ErrorState(this.game, error));
      return { continue: false, error: error.message };
    }
  }
}

/**
 * State for player's turn
 */
class PlayerTurnState extends GameState {
  constructor(game) {
    super(game);
  }
  
  /**
   * Handle player turn
   */
  handle(input) {
    try {
      if (!input || input.trim() === '') {
        return { continue: true, error: 'Invalid input' };
      }
      const result = this.game.processPlayerMove(input);
      if (result.success) {
        this.game.setState(new CPUTurnState(this.game));
      }
      return { continue: true };
    } catch (error) {
      return { continue: true, error: error.message };
    }
  }
}

/**
 * State for CPU's turn
 */
class CPUTurnState extends GameState {
  constructor(game) {
    super(game);
  }
  
  /**
   * Handle CPU turn
   */
  handle() {
    try {
      const result = this.game.processCPUMove();
      if (result.success) {
        this.game.setState(new PlayerTurnState(this.game));
      }
      return { continue: true };
    } catch (error) {
      return { continue: true, error: error.message };
    }
  }
}

/**
 * State when game is paused (for future implementation)
 */
class PausedState extends GameState {
  constructor(game, previousState) {
    super(game);
    this.previousState = previousState;
  }

  /**
   * Resume game
   * @returns {PlayingState} New playing state
   */
  resume() {
    if (this.previousState) {
      this.game.setState(this.previousState);
      return true;
    }
    return false;
  }
}

/**
 * State when an error occurs
 */
class ErrorState extends GameState {
  /**
   * Create error state
   * @param {Game} game - Game object
   * @param {Error} error - Error that occurred
   */
  constructor(game, error) {
    super(game);
    this.error = error;
  }

  /**
   * Handle error state
   */
  handle() {
    this.game.notify('error', {
      message: this.error.message,
      state: this.getName()
    });
    return { continue: false, error: this.error.message };
  }

  /**
   * Get error information
   * @returns {Object} Error details
   */
  getErrorInfo() {
    return {
      message: this.error.message,
      timestamp: new Date(),
      state: this.getName()
    };
  }
}

/**
 * State machine manager for game state transitions
 */
class GameStateMachine {
  constructor(initialState) {
    this.currentState = initialState;
    this.stateHistory = [{ 
      name: initialState.getName(),
      timestamp: new Date()
    }];
  }

  /**
   * Transition to a new state
   * @param {GameState} newState - State to transition to
   */
  setState(newState) {
    if (this.currentState) {
      this.currentState.exit();
    }
    
    this.currentState = newState;
    this.stateHistory.push({
      name: newState.getName(),
      timestamp: new Date()
    });
    
    this.currentState.enter();
  }

  /**
   * Execute current state
   */
  handle(input) {
    if (!this.currentState) {
      throw new Error('No current state');
    }
    
    const result = this.currentState.handle(input);
    
    if (this.currentState.checkTransition) {
      const nextState = this.currentState.checkTransition();
      if (nextState) {
        this.setState(nextState);
      }
    }
    
    return result;
  }

  /**
   * Get current state name
   * @returns {string} Current state name
   */
  getStateName() {
    return this.currentState ? this.currentState.getName() : 'None';
  }

  /**
   * Get current state
   * @returns {GameState} Current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get state history
   * @returns {string[]} Array of state names
   */
  getStateHistory() {
    return this.stateHistory;
  }

  /**
   * Check if in specific state
   * @param {Function} stateClass - State class to check
   * @returns {boolean} True if in specified state
   */
  isInState(stateClass) {
    return this.currentState instanceof stateClass;
  }
}

class SetupState extends GameState {
  constructor(game) {
    super(game);
  }

  enter() {
    this.game.notify('setup', { message: 'Place your ships' });
  }

  handleInput(input) {
    switch (input) {
      case 'start':
        this.game.setState(new PlayState(this.game));
        break;
      case 'quit':
        this.game.quit();
        break;
      default:
        this.game.notify('error', { message: 'Invalid command in Setup state' });
    }
  }
}

class PlayState extends GameState {
  constructor(game) {
    super(game);
  }

  enter() {
    this.game.notify('play', { message: 'Your turn to attack' });
  }

  handleInput(input) {
    if (!input || input.trim() === '') {
      this.game.notify('error', { message: 'Invalid input' });
      return;
    }

    const coordinate = input.trim().toUpperCase();
    const result = this.game.processPlayerMove(coordinate);
    
    if (result.success) {
      if (result.hit) {
        this.game.notify('hit', { coordinate });
        if (result.sunk) {
          this.game.notify('shipSunk', { ship: result.ship });
        }
      } else {
        this.game.notify('miss', { coordinate });
      }
      
      this.game.setState(new CPUTurnState(this.game));
    } else {
      this.game.notify('error', { message: result.error });
    }
  }
}

module.exports = {
  GameState,
  InitializationState,
  PlayerTurnState,
  CPUTurnState,
  GameOverState,
  GameStateMachine,
  PlayingState,
  PausedState,
  ErrorState,
  SetupState,
  PlayState
}; 