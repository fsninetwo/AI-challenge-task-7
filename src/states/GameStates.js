/**
 * Game States - State Pattern Implementation
 * 
 * Manages different game states and their transitions.
 * Implements State pattern for clean state management.
 * 
 * @module GameStates
 */

const GameConfig = require('../config/GameConfig');

/**
 * Abstract base class for game states
 */
class GameState {
  /**
   * Create a new game state
   * @param {Game} context - Game context
   */
  constructor(context) {
    this.context = context;
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
}

/**
 * State when game is actively being played
 */
class PlayingState extends GameState {
  /**
   * Handle playing state - display boards and request input
   */
  handle() {
    this.context.displayBoards();
    this.context.requestPlayerInput();
  }

  /**
   * Check if state should transition
   * @returns {GameState|null} New state or null to stay in current state
   */
  checkTransition() {
    if (this.context.cpuNumShips === 0) {
      return new GameOverState(this.context, 'player');
    }
    if (this.context.playerNumShips === 0) {
      return new GameOverState(this.context, 'cpu');
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
   * @param {Game} context - Game context
   * @param {string} winner - Winner ('player' or 'cpu')
   */
  constructor(context, winner) {
    super(context);
    this.winner = winner;
    this.endTime = new Date();
  }
  
  /**
   * Handle game over state - display winner and end game
   */
  handle() {
    const config = new GameConfig();
    
    if (this.winner === 'player') {
      console.log(config.getMessage('playerWin'));
    } else {
      console.log(config.getMessage('cpuWin'));
    }
    
    this.context.displayBoards();
    this.context.endGame();
  }

  /**
   * Get game over information
   * @returns {Object} Game over details
   */
  getGameOverInfo() {
    return {
      winner: this.winner,
      endTime: this.endTime,
      state: this.getName()
    };
  }
}

/**
 * State when game is initializing
 */
class InitializingState extends GameState {
  /**
   * Handle initialization - set up boards and ships
   */
  handle() {
    try {
      console.log('Initializing game...');
      this.context.placeShipsRandomly();
      console.log("\nLet's play Sea Battle!");
      console.log(`Try to sink the ${this.context.cpuNumShips} enemy ships.`);
      
      // Transition to playing state
      this.context.setState(new PlayingState(this.context));
      this.context.currentState.handle();
    } catch (error) {
      console.error('Failed to initialize game:', error.message);
      this.context.setState(new ErrorState(this.context, error));
    }
  }
}

/**
 * State when game is paused (for future implementation)
 */
class PausedState extends GameState {
  /**
   * Handle paused state
   */
  handle() {
    console.log('Game is paused. Press any key to continue...');
    // In a real implementation, this would wait for user input
  }

  /**
   * Resume game
   * @returns {PlayingState} New playing state
   */
  resume() {
    return new PlayingState(this.context);
  }
}

/**
 * State when an error occurs
 */
class ErrorState extends GameState {
  /**
   * Create error state
   * @param {Game} context - Game context
   * @param {Error} error - Error that occurred
   */
  constructor(context, error) {
    super(context);
    this.error = error;
    this.errorTime = new Date();
  }

  /**
   * Handle error state
   */
  handle() {
    console.error('Game encountered an error:', this.error.message);
    console.log('Game will exit.');
    this.context.endGame();
  }

  /**
   * Get error information
   * @returns {Object} Error details
   */
  getErrorInfo() {
    return {
      error: this.error.message,
      stack: this.error.stack,
      errorTime: this.errorTime,
      state: this.getName()
    };
  }
}

/**
 * State machine manager for game state transitions
 */
class StateMachine {
  constructor(initialState) {
    this.currentState = initialState;
    this.stateHistory = [initialState];
    this.maxHistorySize = 10;
  }

  /**
   * Transition to a new state
   * @param {GameState} newState - State to transition to
   */
  transition(newState) {
    console.log(`State transition: ${this.currentState.getName()} -> ${newState.getName()}`);
    
    this.currentState = newState;
    
    // Add to history
    this.stateHistory.push(newState);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Execute current state
   */
  execute() {
    this.currentState.handle();
  }

  /**
   * Get current state name
   * @returns {string} Current state name
   */
  getCurrentStateName() {
    return this.currentState.getName();
  }

  /**
   * Get state history
   * @returns {string[]} Array of state names
   */
  getStateHistory() {
    return this.stateHistory.map(state => state.getName());
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

module.exports = {
  GameState,
  PlayingState,
  GameOverState,
  InitializingState,
  PausedState,
  ErrorState,
  StateMachine
}; 