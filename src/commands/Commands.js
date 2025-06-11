/**
 * Commands - Command Pattern Implementation
 * 
 * Encapsulates game actions as command objects.
 * Implements Command pattern for action execution and potential undo functionality.
 * 
 * @module Commands
 */

const GameConfig = require('../config/GameConfig');

/**
 * Abstract base class for all commands
 */
class Command {
  /**
   * Execute the command
   * @returns {*} Command execution result
   */
  execute() {
    throw new Error('Command must implement execute method');
  }
  
  /**
   * Undo the command (for future implementation)
   * @returns {*} Undo result
   */
  undo() {
    throw new Error('Command must implement undo method');
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
    this.hitShip = null;
    this.previousState = null;
  }
  
  /**
   * Execute the player move
   * @returns {boolean} True if move was a hit
   */
  execute() {
    this.executedAt = new Date();
    const config = new GameConfig();
    const [row, col] = [parseInt(this.coordinate[0]), parseInt(this.coordinate[1])];
    
    // Store previous state for undo
    this.previousState = {
      cpuNumShips: this.gameState.cpuNumShips,
      boardState: this.gameState.cpuBoard.grid.map(row => [...row])
    };
    
    this.gameState.playerGuesses.add(this.coordinate);
    this.hitShip = this.gameState.cpuBoard.getShipAt(this.coordinate);
    
    if (this.hitShip && !this.hitShip.isHit(this.coordinate)) {
      this.hitShip.hit(this.coordinate);
      this.gameState.cpuBoard.markHit(row, col);
      this.wasHit = true;
      
      console.log(config.getMessage('playerHit'));
      
      if (this.hitShip.isSunk()) {
        console.log(config.getMessage('shipSunk'));
        this.gameState.cpuNumShips--;
      }
    } else {
      this.gameState.cpuBoard.markMiss(row, col);
      console.log(config.getMessage('playerMiss'));
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

    // Restore game state
    this.gameState.cpuNumShips = this.previousState.cpuNumShips;
    this.gameState.cpuBoard.grid = this.previousState.boardState;
    this.gameState.playerGuesses.delete(this.coordinate);

    // Restore ship state if it was hit
    if (this.hitShip && this.wasHit) {
      this.hitShip.hits.delete(this.coordinate);
    }

    console.log(`Undid move at ${this.coordinate}`);
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
    this.hitShip = null;
    this.moveDecision = null;
  }
  
  /**
   * Execute the CPU move
   * @returns {boolean} True if move was a hit
   */
  execute() {
    this.executedAt = new Date();
    const config = new GameConfig();
    
    console.log("\n--- CPU's Turn ---");
    
    this.moveDecision = this.aiContext.makeMove(this.gameState);
    this.coordinate = this.moveDecision.coordinate;
    
    const [row, col] = [parseInt(this.coordinate[0]), parseInt(this.coordinate[1])];
    
    this.gameState.cpuGuesses.add(this.coordinate);
    this.hitShip = this.gameState.playerBoard.getShipAt(this.coordinate);
    
    if (this.hitShip && !this.hitShip.isHit(this.coordinate)) {
      this.hitShip.hit(this.coordinate);
      this.gameState.playerBoard.markHit(row, col);
      this.wasHit = true;
      
      console.log(config.getMessage('cpuHit', { coordinate: this.coordinate }));
      
      if (this.hitShip.isSunk()) {
        console.log(config.getMessage('cpuShipSunk'));
        this.gameState.playerNumShips--;
        this.aiContext.switchToHunt();
      } else {
        this.aiContext.switchToTarget(row, col, this.gameState);
      }
    } else {
      this.gameState.playerBoard.markMiss(row, col);
      console.log(config.getMessage('cpuMiss', { coordinate: this.coordinate }));
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
      strategy: this.moveDecision?.mode,
      aiState: this.aiContext.getStats?.() || {},
      executedAt: this.executedAt
    };
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
    this.initialized = false;
  }

  /**
   * Execute game initialization
   * @returns {boolean} True if initialization successful
   */
  execute() {
    this.executedAt = new Date();
    
    try {
      console.log('Boards created.');
      this.game.placeShipsRandomly();
      console.log("\nLet's play Sea Battle!");
      console.log(`Try to sink the ${this.game.cpuNumShips} enemy ships.`);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize game:', error.message);
      return false;
    }
  }

  /**
   * Reset game to uninitialized state
   * @returns {boolean} True if reset successful
   */
  undo() {
    if (!this.initialized) {
      return false;
    }

    // Reset game boards and state
    this.game.playerBoard.reset();
    this.game.cpuBoard.reset();
    this.game.playerGuesses.clear();
    this.game.cpuGuesses.clear();
    
    this.initialized = false;
    console.log('Game reset to initial state');
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
 * Command invoker for managing command execution
 */
class CommandInvoker {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Execute a command and add to history
   * @param {Command} command - Command to execute
   * @returns {*} Command execution result
   */
  execute(command) {
    const result = command.execute();
    
    // Add to history
    this.history.push(command);
    this.currentIndex = this.history.length - 1;
    
    return result;
  }

  /**
   * Undo the last command
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      const result = command.undo();
      if (result) {
        this.currentIndex--;
      }
      return result;
    }
    return false;
  }

  /**
   * Redo the next command
   * @returns {boolean} True if redo was successful
   */
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      return command.execute();
    }
    return false;
  }

  /**
   * Get command history
   * @returns {Command[]} Array of executed commands
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.history = [];
    this.currentIndex = -1;
  }
}

module.exports = {
  Command,
  PlayerMoveCommand,
  CPUMoveCommand,
  InitializeGameCommand,
  DisplayBoardsCommand,
  CommandInvoker
}; 