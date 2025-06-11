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
    this.name = 'BaseState';
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
    return this.name || this.constructor.name;
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
   * @param {Game|string} contextOrWinner - Game context or winner string
   * @param {string} [winner] - Winner ('player' or 'cpu') if first param is context
   */
  constructor(contextOrWinner, winner) {
    // Handle both constructor signatures
    if (typeof contextOrWinner === 'string') {
      // Called with just winner (for tests)
      super(null);
      this.winner = contextOrWinner;
    } else {
      // Called with context and winner (for normal usage)
      super(contextOrWinner);
      this.winner = winner;
    }
    this.name = 'GameOver';
    this.endTime = new Date();
  }
  
  /**
   * Handle game over state - display winner and end game
   */
  handle() {
    const config = new GameConfig();
    let message;
    
    if (this.winner === 'player') {
      message = config.getMessage('playerWin');
      console.log(message);
    } else {
      message = config.getMessage('cpuWin');
      console.log(message);
    }
    
    if (this.context && this.context.displayBoards) {
      this.context.displayBoards();
    }
    if (this.context && this.context.endGame) {
      this.context.endGame();
    }
    
    return { continue: false, winner: this.winner, message };
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
class InitializationState extends GameState {
  constructor(context) {
    super(context);
    this.name = 'Initialization';
  }
  
  /**
   * Handle initialization - set up boards and ships
   */
  handle(context) {
    try {
      console.log('Initializing game...');
      const gameContext = context || this.context;
      
      if (gameContext && gameContext.playerBoard && gameContext.playerBoard.reset) {
        gameContext.playerBoard.reset();
      }
      if (gameContext && gameContext.cpuBoard && gameContext.cpuBoard.reset) {
        gameContext.cpuBoard.reset();
      }
      
      if (gameContext && gameContext.initializeGame) {
        gameContext.initializeGame();
      } else if (gameContext && gameContext.placeShipsRandomly) {
        gameContext.placeShipsRandomly();
      }
      
      console.log("\nLet's play Sea Battle!");
      console.log(`Try to sink the ${gameContext ? gameContext.cpuNumShips || 3 : 3} enemy ships.`);
      
      // Transition to player turn state
      if (gameContext && gameContext.setState) {
        gameContext.setState(new PlayerTurnState(gameContext));
      }
      return { continue: true };
    } catch (error) {
      console.error('Failed to initialize game:', error.message);
      const gameContext = context || this.context;
      if (gameContext && gameContext.setState) {
        gameContext.setState(new ErrorState(gameContext, error));
      }
      return { continue: false, error: error.message };
    }
  }
}

/**
 * State for player's turn
 */
class PlayerTurnState extends GameState {
  constructor(context) {
    super(context);
    this.name = 'PlayerTurn';
  }
  
  /**
   * Handle player turn
   */
  handle(contextOrInput, input) {
    // Handle both calling conventions
    const gameContext = (contextOrInput && typeof contextOrInput === 'object' && contextOrInput.processPlayerMove) 
      ? contextOrInput 
      : this.context;
    const playerInput = input || (typeof contextOrInput === 'string' ? contextOrInput : null);
    
    if (!gameContext || !gameContext.processPlayerMove) {
      return { continue: false, error: 'No game context available' };
    }
    
    const result = gameContext.processPlayerMove(playerInput);
    
    if (result.hit && gameContext.cpuNumShips === 0) {
      gameContext.setState(new GameOverState(gameContext, 'player'));
      return { continue: false, winner: 'player' };
    }
    
    if (result.continue) {
      gameContext.setState(new CPUTurnState(gameContext));
      return { continue: true, hit: result.hit };
    }
    
    return { continue: true, hit: result.hit };
  }
}

/**
 * State for CPU's turn
 */
class CPUTurnState extends GameState {
  constructor(context) {
    super(context);
    this.name = 'CPUTurn';
  }
  
  /**
   * Handle CPU turn
   */
  handle(context) {
    const gameContext = context || this.context;
    
    if (!gameContext || !gameContext.processCPUMove) {
      return { continue: false, error: 'No game context available' };
    }
    
    const result = gameContext.processCPUMove();
    
    if (result.hit && gameContext.playerNumShips === 0) {
      gameContext.setState(new GameOverState(gameContext, 'cpu'));
      return { continue: false, winner: 'cpu' };
    }
    
    if (result.continue) {
      gameContext.setState(new PlayerTurnState(gameContext));
      return { continue: true, hit: result.hit };
    }
    
    return { continue: true, hit: result.hit };
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
class GameStateMachine {
  constructor(initialState) {
    this.currentState = initialState || new InitializationState();
    this.stateHistory = [this.currentState];
    this.maxHistorySize = 10;
  }

  /**
   * Transition to a new state
   * @param {GameState} newState - State to transition to
   */
  setState(newState) {
    if (this.currentState && newState && typeof newState.getName === 'function') {
      console.log(`State transition: ${this.currentState.getName()} -> ${newState.getName()}`);
    }
    
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
  handle(context, input) {
    if (this.currentState.handle.length === 0) {
      // State doesn't expect arguments
      return this.currentState.handle();
    } else if (this.currentState.handle.length === 1) {
      // State expects one argument (context or input)
      return this.currentState.handle(context || input);
    } else {
      // State expects multiple arguments
      return this.currentState.handle(context, input);
    }
  }

  /**
   * Get current state name
   * @returns {string} Current state name
   */
  getStateName() {
    return this.currentState ? this.currentState.getName() : 'Unknown';
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
  InitializationState,
  PlayerTurnState,
  CPUTurnState,
  GameOverState,
  GameStateMachine,
  PlayingState,
  PausedState,
  ErrorState
}; 