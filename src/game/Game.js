/**
 * Game Controller - Main Game Orchestration
 * 
 * Coordinates all game components and manages the game flow.
 * Acts as the main controller in the MVC pattern.
 * 
 * @module Game
 */

const readline = require('readline');

// Import all required modules
const GameConfig = require('../config/GameConfig');
const { InputValidator, InputFormatValidator, CoordinateRangeValidator, DuplicateGuessValidator } = require('../validation/ValidationStrategy');
const Ship = require('../entities/Ship');
const GameBoard = require('../entities/GameBoard');
const ShipFactory = require('../entities/ShipFactory');
const { AIContext } = require('../ai/AIStrategies');
const { PlayerMoveCommand, CPUMoveCommand, CommandInvoker } = require('../commands/Commands');
const { GameStatsObserver, EventEmitter } = require('../observers/GameObservers');
const { InitializationState, PlayerTurnState, CPUTurnState, GameOverState, GameStateMachine } = require('../states/GameStates');

/**
 * Main Game class that orchestrates the Sea Battle game
 */
class Game {
  constructor() {
    // Configuration
    this.config = new GameConfig();
    
    // Event system
    this.eventEmitter = new EventEmitter();
    this.statsObserver = new GameStatsObserver();
    
    // AI system
    this.aiContext = new AIContext();
    
    // Command system
    this.commandInvoker = new CommandInvoker();
    
    // Game boards
    this.playerBoard = new GameBoard();
    this.cpuBoard = new GameBoard();
    
    // Game state
    this.playerGuesses = new Set();
    this.cpuGuesses = new Set();
    this.playerNumShips = this.config.get('numShips');
    this.cpuNumShips = this.config.get('numShips');
    
    // Input validation
    this.inputValidator = {
      strategies: [],
      addStrategy: function(strategy) {
        this.strategies.push(strategy);
        return this;
      },
      validate: function(input) {
        for (const strategy of this.strategies) {
          const result = strategy.validate(input);
          if (!result.isValid) {
            return result;
          }
        }
        return { isValid: true };
      }
    };
    
    // Add strategies manually to avoid mock issues
    this.inputValidator
      .addStrategy(new InputFormatValidator())
      .addStrategy(new CoordinateRangeValidator())
      .addStrategy(new DuplicateGuessValidator(this.playerGuesses));
    
    // State management
    this.stateMachine = new GameStateMachine(new InitializationState(this));
    this.currentState = this.stateMachine.getCurrentState();
    
    // Input interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Setup event system
    this.setupObservers();
  }
  
  /**
   * Set up event observers
   */
  setupObservers() {
    this.eventEmitter.subscribe(this.statsObserver);
  }
  
  /**
   * Initialize the game - place ships and prepare for play
   */
  initialize() {
    console.log('Boards created.');
    this.placeShipsRandomly();
    console.log("\nLet's play Sea Battle!");
    console.log(`Try to sink the ${this.cpuNumShips} enemy ships.`);
    
    this.eventEmitter.notify('gameStart');
  }

  /**
   * Initialize the game (alias for tests)
   */
  initializeGame() {
    return this.initialize();
  }
  
  /**
   * Place ships randomly on both boards
   */
  placeShipsRandomly() {
    const numShips = this.config.get('numShips');
    const shipLength = this.config.get('shipLength');
    
    // Create factory instance
    const shipFactory = new ShipFactory();
    
    // Place player ships (visible)
    try {
      for (let i = 0; i < numShips; i++) {
        const ship = ShipFactory.createRandomShip(this.playerBoard, shipLength);
        this.playerBoard.placeShip(ship, true);
      }
      console.log(`${numShips} ships placed randomly for Player.`);
    } catch (error) {
      // Fallback to factory method if static method fails
      const playerShips = shipFactory.generateShips();
      playerShips.forEach(ship => this.playerBoard.placeShip(ship, true));
      console.log(`${numShips} ships placed randomly for Player.`);
    }
    
    // Place CPU ships (hidden)
    try {
      for (let i = 0; i < numShips; i++) {
        const ship = ShipFactory.createRandomShip(this.cpuBoard, shipLength);
        this.cpuBoard.placeShip(ship, false);
      }
      console.log(`${numShips} ships placed randomly for CPU.`);
    } catch (error) {
      // Fallback to factory method if static method fails
      const cpuShips = shipFactory.generateShips();
      cpuShips.forEach(ship => this.cpuBoard.placeShip(ship, false));
      console.log(`${numShips} ships placed randomly for CPU.`);
    }
  }
  
  /**
   * Display both game boards side by side
   */
  displayBoards() {
    console.log('\n   --- OPPONENT BOARD ---          --- YOUR BOARD ---');
    
    const opponentRows = this.cpuBoard.display();
    const playerRows = this.playerBoard.display();
    
    opponentRows.forEach((opponentRow, index) => {
      const combinedRow = `${opponentRow}     ${playerRows[index]}`;
      console.log(combinedRow);
    });
    
    console.log('\n');
  }
  
  /**
   * Request input from the player
   */
  requestPlayerInput() {
    this.rl.question('Enter your guess (e.g., 00): ', (answer) => {
      this.processPlayerTurn(answer);
    });
  }
  
  /**
   * Process a player's turn
   * @param {string} input - Player's input coordinate
   */
  processPlayerTurn(input) {
    // Validate input using strategy pattern
    const validator = new InputValidator()
      .addStrategy(new InputFormatValidator())
      .addStrategy(new CoordinateRangeValidator())
      .addStrategy(new DuplicateGuessValidator(this.playerGuesses));
    
    const validation = validator.validate(input);
    if (!validation.isValid) {
      console.log(validation.message);
      this.currentState.handle();
      return;
    }
    
    // Execute player move using command pattern
    const gameState = {
      playerGuesses: this.playerGuesses,
      cpuBoard: this.cpuBoard,
      cpuNumShips: this.cpuNumShips
    };
    
    const playerCommand = new PlayerMoveCommand(input, gameState);
    const playerHit = playerCommand.execute();
    
    // Update game state
    this.cpuNumShips = gameState.cpuNumShips;
    
    // Notify observers
    this.eventEmitter.notify(playerHit ? 'playerHit' : 'playerMiss');
    
    // Check for game over
    if (this.checkGameOver()) return;
    
    // Process CPU turn
    this.processCPUTurn();
  }
  
  /**
   * Process CPU's turn
   */
  processCPUTurn() {
    const gameState = {
      cpuGuesses: this.cpuGuesses,
      playerBoard: this.playerBoard,
      playerNumShips: this.playerNumShips
    };
    
    const cpuCommand = new CPUMoveCommand(this.aiContext, gameState);
    const cpuHit = cpuCommand.execute();
    
    // Update game state
    this.playerNumShips = gameState.playerNumShips;
    
    // Notify observers
    this.eventEmitter.notify(cpuHit ? 'cpuHit' : 'cpuMiss');
    this.eventEmitter.notify('turnComplete');
    
    // Check for game over
    if (this.checkGameOver()) return;
    
    // Continue game
    this.currentState.handle();
  }

  /**
   * Process a player move (for state machine)
   * @param {string} input - Player input
   * @returns {Object} Move result
   */
  processPlayerMove(input) {
    if (!input) {
      return { continue: false, hit: false, error: 'No input provided' };
    }

    // Validate input using strategy pattern
    const validation = this.inputValidator.validate(input);
    if (!validation.isValid) {
      return { continue: false, hit: false, error: validation.message };
    }

    // Execute player move using command pattern
    const gameState = {
      playerGuesses: this.playerGuesses,
      cpuBoard: this.cpuBoard,
      cpuNumShips: this.cpuNumShips
    };

    const playerCommand = new PlayerMoveCommand(input, gameState);
    const playerHit = playerCommand.execute();

    // Update game state
    this.cpuNumShips = gameState.cpuNumShips;

    // Notify observers
    this.eventEmitter.notify(playerHit ? 'playerHit' : 'playerMiss');

    return { continue: true, hit: playerHit };
  }

  /**
   * Process a CPU move (for state machine)
   * @returns {Object} Move result
   */
  processCPUMove() {
    const gameState = {
      cpuGuesses: this.cpuGuesses,
      playerBoard: this.playerBoard,
      playerNumShips: this.playerNumShips
    };

    const cpuCommand = new CPUMoveCommand(this.aiContext, gameState);
    const cpuHit = cpuCommand.execute();

    // Update game state
    this.playerNumShips = gameState.playerNumShips;

    // Notify observers
    this.eventEmitter.notify(cpuHit ? 'cpuHit' : 'cpuMiss');
    this.eventEmitter.notify('turnComplete');

    return { continue: true, hit: cpuHit };
  }
  
  /**
   * Check if game is over and transition to game over state if needed
   * @returns {boolean} True if game is over
   */
  checkGameOver() {
    if (this.cpuNumShips === 0) {
      this.currentState = new GameOverState(this, 'player');
      this.currentState.handle();
      return true;
    }
    
    if (this.playerNumShips === 0) {
      this.currentState = new GameOverState(this, 'cpu');
      this.currentState.handle();
      return true;
    }
    
    return false;
  }
  
  /**
   * End the game and display statistics
   */
  endGame() {
    this.eventEmitter.notify('gameEnd');
    
    console.log('\nGame Statistics:');
    const stats = this.statsObserver.getStats();
    console.log(`Player - Hits: ${stats.playerHits}, Misses: ${stats.playerMisses}`);
    console.log(`CPU - Hits: ${stats.cpuHits}, Misses: ${stats.cpuMisses}`);
    console.log(`Total turns: ${stats.turnsPlayed}`);
    
    if (stats.playerHits + stats.playerMisses > 0) {
      const playerAccuracy = (stats.playerHits / (stats.playerHits + stats.playerMisses) * 100).toFixed(1);
      console.log(`Player accuracy: ${playerAccuracy}%`);
    }
    
    if (stats.cpuHits + stats.cpuMisses > 0) {
      const cpuAccuracy = (stats.cpuHits / (stats.cpuHits + stats.cpuMisses) * 100).toFixed(1);
      console.log(`CPU accuracy: ${cpuAccuracy}%`);
    }
    
    this.rl.close();
  }
  
  /**
   * Set the current game state
   * @param {GameState} state - New game state
   */
  setState(state) {
    this.currentState = state;
  }
  
  /**
   * Start the game
   */
  start() {
    this.initialize();
    this.currentState.handle();
  }
  
  /**
   * Get current game status for external monitoring
   * @returns {Object} Game status information
   */
  getGameStatus() {
    return {
      playerShips: this.playerNumShips,
      cpuShips: this.cpuNumShips,
      currentState: this.currentState.getName(),
      totalTurns: this.statsObserver.getStats().turnsPlayed,
      playerMoves: this.playerGuesses.size,
      cpuMoves: this.cpuGuesses.size
    };
  }
  
  /**
   * Save game state (for future implementation)
   * @returns {Object} Serializable game state
   */
  saveGame() {
    return {
      playerBoard: this.playerBoard.getStats(),
      cpuBoard: this.cpuBoard.getStats(),
      playerGuesses: Array.from(this.playerGuesses),
      cpuGuesses: Array.from(this.cpuGuesses),
      playerNumShips: this.playerNumShips,
      cpuNumShips: this.cpuNumShips,
      stats: this.statsObserver.getStats(),
      currentState: this.currentState.getName(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Reset game to initial state
   */
  reset() {
    this.playerBoard.reset();
    this.cpuBoard.reset();
    this.playerGuesses.clear();
    this.cpuGuesses.clear();
    this.playerNumShips = this.config.get('numShips');
    this.cpuNumShips = this.config.get('numShips');
    this.aiContext = new AIContext();
    this.statsObserver = new GameStatsObserver();
    this.eventEmitter = new EventEmitter();
    this.commandInvoker = new CommandInvoker();
    this.currentState = new PlayingState(this);
    
    this.setupObservers();
  }
}

module.exports = Game; 