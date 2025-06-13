/**
 * Commands - Command Pattern Implementation
 * 
 * Encapsulates game actions as command objects.
 * Implements Command pattern for action execution and potential undo functionality.
 * 
 * @module Commands
 */

const GameConfig = require('../config/GameConfig');
const { HuntStrategy } = require('../ai/AIStrategy');

/**
 * Abstract base class for all commands
 */
class Command {
  /**
   * Execute the command
   * @returns {*} Command execution result
   */
  execute() {
    throw new Error('execute() must be implemented');
  }
  
  /**
   * Undo the command (for future implementation)
   * @returns {*} Undo result
   */
  undo() {
    throw new Error('undo() must be implemented');
  }

  /**
   * Get command metadata
   * @returns {Object} Command information
   */
  getInfo() {
    return {
      type: this.constructor.name,
      executedAt: this.executedAt,
      canUndo: typeof this.undo === 'function'
    };
  }
}

/**
 * Command for processing player moves
 */
class PlayerMoveCommand extends Command {
  /**
   * Create a player move command
   * @param {string} coordinate - Target coordinate (e.g., '05')
   * @param {Object} gameState - Current game state
   */
  constructor(coordinate, gameState) {
    super();
    this.coordinate = coordinate;
    this.gameState = gameState;
    this.wasHit = false;
    this.previousState = null;
  }
  
  /**
   * Execute the player move
   * @returns {boolean} True if move was a hit
   */
  execute() {
    if (!this.coordinate || !this.gameState) {
      throw new Error('Invalid command parameters');
    }

    // Save previous state for undo
    this.previousState = {
      playerGuesses: new Set(this.gameState.playerGuesses),
      cpuBoard: {
        hits: new Set(this.gameState.cpuBoard.hits),
        misses: new Set(this.gameState.cpuBoard.misses)
      }
    };

    // Add guess to history
    this.gameState.playerGuesses.add(this.coordinate);

    // Check if hit
    const ship = this.gameState.cpuBoard.getShipAt(this.coordinate);
    this.wasHit = ship !== null;

    // Update board state
    if (this.wasHit) {
      this.gameState.cpuBoard.hits.add(this.coordinate);
      ship.hit(this.coordinate);
      if (ship.isSunk()) {
        this.gameState.cpuNumShips--;
      }
    } else {
      this.gameState.cpuBoard.misses.add(this.coordinate);
    }

    return this.wasHit;
  }

  /**
   * Undo the player move
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (!this.previousState) {
      return false;
    }

    this.gameState.playerGuesses = this.previousState.playerGuesses;
    this.gameState.cpuBoard.hits = this.previousState.cpuBoard.hits;
    this.gameState.cpuBoard.misses = this.previousState.cpuBoard.misses;

    return true;
  }
}

/**
 * Command for processing CPU moves
 */
class CPUMoveCommand extends Command {
  /**
   * Create a CPU move command
   * @param {AIContext} aiContext - AI context for decision making
   * @param {Object} gameState - Current game state
   */
  constructor(aiContext, gameState) {
    super();
    this.aiContext = aiContext;
    this.gameState = gameState;
    this.coordinate = null;
    this.wasHit = false;
    this.executedAt = null;
    this.strategy = 'hunt';
    this.previousState = null;
  }
  
  /**
   * Execute the CPU move
   * @returns {boolean} True if move was a hit
   */
  execute() {
    if (!this.aiContext || !this.gameState) {
      throw new Error('Invalid command parameters');
    }

    // Save previous state
    this.previousState = {
      cpuGuesses: new Set(this.gameState.cpuGuesses),
      playerBoard: {
        hits: new Set(this.gameState.playerBoard.hits),
        misses: new Set(this.gameState.playerBoard.misses)
      }
    };

    // Get AI move
    const move = this.aiContext.makeMove(this.gameState);
    this.coordinate = move.coordinate;
    this.executedAt = new Date();
    this.strategy = move.strategy;

    this.gameState.cpuGuesses.add(this.coordinate);

    // Check if hit
    const ship = this.gameState.playerBoard.getShipAt(this.coordinate);
    this.wasHit = ship !== null;

    // Update board state
    if (this.wasHit) {
      this.gameState.playerBoard.hits.add(this.coordinate);
      ship.hit(this.coordinate);
      if (ship.isSunk()) {
        this.gameState.playerNumShips--;
        if (this.aiContext.updateResult) {
          this.aiContext.updateResult(this.coordinate, true, true);
        }
      } else {
        if (this.aiContext.updateResult) {
          this.aiContext.updateResult(this.coordinate, true, false);
        }
      }
    } else {
      this.gameState.playerBoard.misses.add(this.coordinate);
      if (this.aiContext.updateResult) {
        this.aiContext.updateResult(this.coordinate, false, false);
      }
    }

    return this.wasHit;
  }

  /**
   * Get move analysis information
   * @returns {Object} Move analysis data
   */
  getMoveAnalysis() {
    return {
      coordinate: this.coordinate,
      wasHit: this.wasHit,
      strategy: this.strategy,
      executedAt: this.executedAt,
      aiState: {
        mode: this.strategy || 'hunt'
      }
    };
  }

  /**
   * Undo the CPU move
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (!this.previousState) {
      return false;
    }

    this.gameState.cpuGuesses = this.previousState.cpuGuesses;
    this.gameState.playerBoard.hits = this.previousState.playerBoard.hits;
    this.gameState.playerBoard.misses = this.previousState.playerBoard.misses;

    return true;
  }
}

/**
 * Command for initializing game state
 */
class InitializeGameCommand extends Command {
  /**
   * Create game initialization command
   * @param {Game} game - Game instance to initialize
   */
  constructor(game) {
    super();
    this.game = game;
    this.previousState = null;
  }

  /**
   * Execute game initialization
   * @returns {boolean} True if initialization successful
   */
  execute() {
    if (!this.game) {
      throw new Error('Invalid game instance');
    }

    // Save previous state
    this.previousState = {
      playerBoard: this.game.playerBoard ? { ...this.game.playerBoard } : null,
      cpuBoard: this.game.cpuBoard ? { ...this.game.cpuBoard } : null,
      currentState: this.game.currentState,
      playerNumShips: this.game.playerNumShips,
      cpuNumShips: this.game.cpuNumShips
    };

    const config = new GameConfig();
    const boardSize = config.get('boardSize');

    this.game.playerBoard = {
      size: boardSize,
      ships: [],
      hits: new Set(),
      misses: new Set(),
      getShipAt: (coord) => this.game.playerBoard.ships.find(s => s.locations.includes(coord))
    };

    this.game.cpuBoard = {
      size: boardSize,
      ships: [],
      hits: new Set(),
      misses: new Set(),
      getShipAt: (coord) => this.game.cpuBoard.ships.find(s => s.locations.includes(coord))
    };

    this.game.playerNumShips = 0;
    this.game.cpuNumShips = 0;
    this.game.playerGuesses = new Set();
    this.game.cpuGuesses = new Set();

    return true;
  }

  /**
   * Reset game to uninitialized state
   * @returns {boolean} True if reset successful
   */
  undo() {
    if (!this.previousState) {
      return false;
    }

    this.game.playerBoard = this.previousState.playerBoard;
    this.game.cpuBoard = this.previousState.cpuBoard;
    this.game.currentState = this.previousState.currentState;
    this.game.playerNumShips = this.previousState.playerNumShips;
    this.game.cpuNumShips = this.previousState.cpuNumShips;

    return true;
  }
}

/**
 * Command for displaying game boards
 */
class DisplayBoardsCommand extends Command {
  /**
   * Create display boards command
   * @param {GameBoard} playerBoard - Player's board
   * @param {GameBoard} cpuBoard - CPU's board
   */
  constructor(playerBoard, cpuBoard) {
    super();
    this.playerBoard = playerBoard;
    this.cpuBoard = cpuBoard;
  }

  /**
   * Execute board display
   * @returns {string[]} Array of display lines
   */
  execute() {
    this.executedAt = new Date();
    
    console.log('\n   --- OPPONENT BOARD ---          --- YOUR BOARD ---');
    
    const opponentRows = this.cpuBoard.display();
    const playerRows = this.playerBoard.display();
    
    const displayLines = [];
    
    opponentRows.forEach((opponentRow, index) => {
      const combinedRow = `${opponentRow}     ${playerRows[index]}`;
      console.log(combinedRow);
      displayLines.push(combinedRow);
    });
    
    console.log('\n');
    
    return displayLines;
  }

  /**
   * No undo needed for display command
   * @returns {boolean} Always returns true
   */
  undo() {
    // Display commands don't need to be undone
    return true;
  }
}

/**
 * Command for attacking a board
 */
class AttackCommand extends Command {
  constructor(board, coordinate) {
    super();
    this.board = board;
    this.coordinate = coordinate;
    this.previousState = null;
  }

  execute() {
    if (!this.board || !this.coordinate) {
      throw new Error('Invalid command parameters');
    }

    // Save previous state
    this.previousState = {
      hits: new Set(this.board.hits),
      misses: new Set(this.board.misses)
    };

    // Check if hit
    const ship = this.board.getShipAt(this.coordinate);
    const isHit = ship !== null;

    // Update board state
    if (isHit) {
      this.board.hits.add(this.coordinate);
      ship.hit(this.coordinate);
    } else {
      this.board.misses.add(this.coordinate);
    }

    return { hit: isHit };
  }

  undo() {
    if (!this.previousState) {
      return false;
    }

    this.board.hits = this.previousState.hits;
    this.board.misses = this.previousState.misses;

    return true;
  }
}

/**
 * Command for placing a ship
 */
class PlaceShipCommand extends Command {
  constructor(board, ship) {
    super();
    this.board = board;
    this.ship = ship;
    this.previousState = null;
  }

  execute() {
    if (!this.board || !this.ship) {
      throw new Error('Invalid command parameters');
    }

    // Save previous state
    this.previousState = {
      ships: [...this.board.ships]
    };

    // Validate ship placement
    const isValid = !this.board.ships.some(existingShip => {
      return existingShip.locations.some(loc => this.ship.locations.includes(loc));
    });

    if (!isValid) {
      return { success: false, error: 'Invalid ship placement - overlapping ships' };
    }

    this.board.ships.push(this.ship);
    return { success: true };
  }

  undo() {
    if (!this.previousState) {
      return false;
    }

    this.board.ships = this.previousState.ships;
    return true;
  }
}

/**
 * Command for quitting the game
 */
class QuitCommand extends Command {
  constructor(game) {
    super();
    this.game = game;
    this.previousState = null;
  }

  execute() {
    if (!this.game) {
      throw new Error('Game object required');
    }

    try {
      this.game.notify('gameQuit');
      this.game.cleanup();
      return true;
    } catch (error) {
      return false;
    }
  }

  undo() {
    return false; // Quit cannot be undone
  }
}

/**
 * Command invoker for managing command execution
 */
class CommandInvoker {
  constructor() {
    this.history = [];
  }

  /**
   * Execute a command and add to history
   * @param {Command} command - Command to execute
   * @returns {*} Command execution result
   */
  execute(command) {
    const result = command.execute();
    this.history.push(command);
    return result;
  }

  /**
   * Undo the last command
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (this.history.length === 0) {
      return false;
    }
    const command = this.history.pop();
    return command.undo();
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.history = [];
    return true;
  }
}

module.exports = {
  Command,
  PlayerMoveCommand,
  CPUMoveCommand,
  InitializeGameCommand,
  DisplayBoardsCommand,
  AttackCommand,
  PlaceShipCommand,
  QuitCommand,
  CommandInvoker
}; 