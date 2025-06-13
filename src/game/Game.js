/**
 * Game Controller - Main Game Orchestration
 * 
 * Coordinates all game components and manages the game flow.
 * Acts as the main controller in the MVC pattern.
 * 
 * @module Game
 */

const EventEmitter = require('events');
const GameConfig = require('../config/GameConfig');
const GameBoard = require('../entities/GameBoard');
const { AIContext } = require('../ai/AIStrategy');
const { GameStatsObserver } = require('../observers/GameObservers');
const ShipFactory = require('../entities/ShipFactory');
const { SetupState, PlayerTurnState } = require('../states/GameStates');
const readline = require('readline');

/**
 * Main game controller class
 */
class Game extends EventEmitter {
  constructor() {
    super();
    this.config = new GameConfig();
    this.playerBoard = new GameBoard();
    this.cpuBoard = new GameBoard();
    this.aiContext = new AIContext();
    this.shipFactory = new ShipFactory();
    this.currentState = null;
    this.playerGuesses = new Set();
    this.cpuGuesses = new Set();
    this.playerNumShips = 0;
    this.cpuNumShips = 0;
    this.observers = [];
    this.setupObservers();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  setupObservers() {
    this.statsObserver = new GameStatsObserver();
    this.observers.push(this.statsObserver);
  }

  notify(event, data) {
    if (this.observers) {
      this.observers.forEach(observer => {
        if (observer && typeof observer.update === 'function') {
          observer.update(event, data);
        }
      });
    }
    this.emit(event, data);
  }

  async initialize() {
    try {
      this.playerBoard = new GameBoard();
      this.cpuBoard = new GameBoard();
      this.playerGuesses = new Set();
      this.cpuGuesses = new Set();
      this.playerNumShips = 0;
      this.cpuNumShips = 0;
      
      await this.placeShipsRandomly();
      this.setState(new SetupState(this));
      await this.currentState.enter();
      this.notify('gameStart');
      
      return { success: true };
    } catch (error) {
      this.notify('error', { message: error.message });
      throw error;
    }
  }

  async placeShipsRandomly() {
    try {
      const config = new GameConfig();
      const patterns = config.get('shipPatterns');
      
      // Place ships on player board
      for (const pattern of patterns) {
        const playerShip = ShipFactory.createRandomShip(this.playerBoard, pattern.length);
        const placed = this.playerBoard.placeShip(playerShip, true);
        if (placed) this.playerNumShips++;
      }
      
      // Place ships on CPU board
      for (const pattern of patterns) {
        const cpuShip = ShipFactory.createRandomShip(this.cpuBoard, pattern.length);
        const placed = this.cpuBoard.placeShip(cpuShip, false);
        if (placed) this.cpuNumShips++;
      }
      
      return { success: true };
    } catch (error) {
      this.notify('error', { message: error.message });
      throw error;
    }
  }

  async processPlayerMove(input) {
    if (!input) {
      return { success: false, error: 'No input provided' };
    }

    if (this.playerGuesses.has(input)) {
      return { success: false, error: 'You already guessed that location!' };
    }

    const { row, col } = this.cpuBoard.parseCoordinate(input);
    if (row === null || col === null) {
      return { success: false, error: 'Invalid coordinate format' };
    }

    this.playerGuesses.add(input);
    const ship = this.cpuBoard.getShipAt(input);
    
    if (ship) {
      ship.hit(input);
      this.cpuBoard.markHit(row, col);
      const wasSunk = ship.isSunk();
      if (wasSunk) {
        this.cpuNumShips--;
        this.notify('shipSunk', { player: 'player' });
      }
      this.notify('playerHit', { coordinate: input });
      return { success: true, hit: true, sunk: wasSunk };
    } else {
      this.cpuBoard.markMiss(row, col);
      this.notify('playerMiss', { coordinate: input });
      return { success: true, hit: false, sunk: false };
    }
  }

  async processCPUMove() {
    const move = this.aiContext.makeMove(this.cpuGuesses, this.playerBoard);
    const coordinate = move.coordinate;
    this.cpuGuesses.add(coordinate);

    const ship = this.playerBoard.getShipAt(coordinate);
    if (ship) {
      ship.hit(coordinate);
      const { row, col } = this.playerBoard.parseCoordinate(coordinate);
      this.playerBoard.markHit(row, col);
      const wasSunk = ship.isSunk();
      if (wasSunk) {
        this.playerNumShips--;
        this.notify('shipSunk', { player: 'cpu' });
      }
      this.notify('cpuHit', { coordinate });
      this.aiContext.updateResult(true, coordinate);
      return { success: true, hit: true, sunk: wasSunk, coordinate };
    } else {
      const { row, col } = this.playerBoard.parseCoordinate(coordinate);
      this.playerBoard.markMiss(row, col);
      this.notify('cpuMiss', { coordinate });
      this.aiContext.updateResult(false, coordinate);
      return { success: true, hit: false, sunk: false, coordinate };
    }
  }

  setState(state) {
    if (this.currentState) {
      this.currentState.exit();
    }
    this.currentState = state;
  }

  displayBoards() {
    console.log('\nPlayer Board:');
    this.playerBoard.display().forEach(line => console.log(line));
    console.log('\nCPU Board:');
    this.cpuBoard.display().forEach(line => console.log(line));
  }

  requestPlayerInput() {
    return new Promise((resolve) => {
      this.rl.question('Enter coordinates (e.g. 00): ', (answer) => {
        resolve(answer.trim());
      });
    });
  }

  checkGameOver() {
    return this.playerNumShips === 0 || this.cpuNumShips === 0;
  }

  endGame(winner) {
    this.notify('gameEnded', { winner });
    this.rl.close();
  }

  getGameStatus() {
    return {
      playerBoard: this.playerBoard,
      cpuBoard: this.cpuBoard,
      currentState: this.currentState ? this.currentState.getName() : null,
      playerNumShips: this.playerNumShips,
      cpuNumShips: this.cpuNumShips,
      playerGuesses: Array.from(this.playerGuesses),
      cpuGuesses: Array.from(this.cpuGuesses),
      totalTurns: this.playerGuesses.size + this.cpuGuesses.size,
      playerMoves: this.playerGuesses.size,
      cpuMoves: this.cpuGuesses.size
    };
  }

  reset() {
    this.playerBoard.reset();
    this.cpuBoard.reset();
    this.playerGuesses.clear();
    this.cpuGuesses.clear();
    this.playerNumShips = 0;
    this.cpuNumShips = 0;
    this.aiContext.reset();
    this.currentState = null;
  }

  quit() {
    this.notify('gameQuit');
    this.rl.close();
    process.exit(0);
  }

  async start() {
    console.log('==================================================');
    console.log('      🚢 Sea Battle Game v2.0 🚢');
    console.log('   Modularized with Design Patterns');
    console.log('==================================================\n');
    
    try {
      await this.initialize();
      console.log('\nLet\'s play Sea Battle!');
      console.log('Try to sink the 3 enemy ships.');
      this.displayBoards();
      
      while (!this.checkGameOver()) {
        const input = await this.requestPlayerInput();
        if (!input) continue;
        
        const result = await this.processPlayerMove(input);
        if (!result.success) {
          console.log(result.error);
          continue;
        }
        
        this.displayBoards();
        
        if (this.checkGameOver()) break;
        
        const cpuResult = await this.processCPUMove();
        this.displayBoards();
      }
      
      const winner = this.cpuNumShips === 0 ? 'player' : 'cpu';
      this.endGame(winner);
    } catch (error) {
      console.error('Game error:', error);
      this.quit();
    }
  }
}

module.exports = Game; 