const readline = require('readline');

// ============================================================================
// CONFIGURATION LAYER - Singleton Pattern
// ============================================================================
class GameConfig {
  constructor() {
    if (GameConfig.instance) {
      return GameConfig.instance;
    }
    
    this.settings = {
      boardSize: 10,
      numShips: 3,
      shipLength: 3,
      symbols: {
        water: '~',
        ship: 'S',
        hit: 'X',
        miss: 'O'
      },
      messages: {
        playerHit: 'PLAYER HIT!',
        playerMiss: 'PLAYER MISS.',
        cpuHit: 'CPU HIT at {coordinate}!',
        cpuMiss: 'CPU MISS at {coordinate}.',
        shipSunk: 'You sunk an enemy battleship!',
        cpuShipSunk: 'CPU sunk your battleship!',
        playerWin: '*** CONGRATULATIONS! You sunk all enemy battleships! ***',
        cpuWin: '*** GAME OVER! The CPU sunk all your battleships! ***',
        invalidInput: 'Oops, input must be exactly two digits (e.g., 00, 34, 98).',
        outOfBounds: 'Oops, please enter valid row and column numbers between 0 and {max}.',
        duplicateGuess: 'You already guessed that location!'
      }
    };
    
    GameConfig.instance = this;
    Object.freeze(this);
  }
  
  get(key) {
    return this.settings[key];
  }
  
  getMessage(key, params = {}) {
    let message = this.settings.messages[key];
    Object.keys(params).forEach(param => {
      message = message.replace(`{${param}}`, params[param]);
    });
    return message;
  }
}

// ============================================================================
// VALIDATION LAYER - Strategy Pattern
// ============================================================================
class ValidationStrategy {
  validate(input) {
    throw new Error('Validation strategy must implement validate method');
  }
}

class InputFormatValidator extends ValidationStrategy {
  validate(input) {
    if (!input || input.length !== 2) {
      return { isValid: false, message: GameConfig.prototype.getMessage('invalidInput') };
    }
    return { isValid: true };
  }
}

class CoordinateRangeValidator extends ValidationStrategy {
  validate(input) {
    const config = new GameConfig();
    const [row, col] = [parseInt(input[0]), parseInt(input[1])];
    const boardSize = config.get('boardSize');
    
    if (isNaN(row) || isNaN(col) || row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      return { 
        isValid: false, 
        message: config.getMessage('outOfBounds', { max: boardSize - 1 })
      };
    }
    return { isValid: true };
  }
}

class DuplicateGuessValidator extends ValidationStrategy {
  constructor(guessHistory) {
    super();
    this.guessHistory = guessHistory;
  }
  
  validate(input) {
    const config = new GameConfig();
    if (this.guessHistory.has(input)) {
      return { isValid: false, message: config.getMessage('duplicateGuess') };
    }
    return { isValid: true };
  }
}

class InputValidator {
  constructor() {
    this.strategies = [];
  }
  
  addStrategy(strategy) {
    this.strategies.push(strategy);
    return this;
  }
  
  validate(input) {
    for (const strategy of this.strategies) {
      const result = strategy.validate(input);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  }
}

// ============================================================================
// ENTITY LAYER - Factory Pattern
// ============================================================================
class Ship {
  constructor(locations = []) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.locations = locations;
    this.hits = new Set();
    this.createdAt = new Date();
  }

  hit(coordinate) {
    if (this.locations.includes(coordinate)) {
      this.hits.add(coordinate);
      return true;
    }
    return false;
  }

  isHit(coordinate) {
    return this.hits.has(coordinate);
  }

  isSunk() {
    return this.locations.every(location => this.hits.has(location));
  }
  
  getStatus() {
    return {
      id: this.id,
      locations: this.locations,
      hits: Array.from(this.hits),
      isSunk: this.isSunk(),
      hitPercentage: (this.hits.size / this.locations.length) * 100
    };
  }
}

class GameBoard {
  constructor(size) {
    const config = new GameConfig();
    this.size = size || config.get('boardSize');
    this.grid = this.initializeGrid();
    this.ships = [];
  }

  initializeGrid() {
    const config = new GameConfig();
    const waterSymbol = config.get('symbols').water;
    return Array(this.size).fill(null).map(() => Array(this.size).fill(waterSymbol));
  }

  isValidCoordinate(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  placeShip(ship, isVisible = false) {
    const config = new GameConfig();
    this.ships.push(ship);
    
    if (isVisible) {
      ship.locations.forEach(location => {
        const [row, col] = this.parseCoordinate(location);
        this.grid[row][col] = config.get('symbols').ship;
      });
    }
  }

  markHit(row, col) {
    const config = new GameConfig();
    this.grid[row][col] = config.get('symbols').hit;
  }

  markMiss(row, col) {
    const config = new GameConfig();
    this.grid[row][col] = config.get('symbols').miss;
  }

  parseCoordinate(coordinate) {
    return [parseInt(coordinate[0]), parseInt(coordinate[1])];
  }

  display() {
    const header = '  ' + Array.from({length: this.size}, (_, i) => i).join(' ');
    const rows = this.grid.map((row, i) => `${i} ${row.join(' ')}`);
    return [header, ...rows];
  }
  
  getShipAt(coordinate) {
    return this.ships.find(ship => ship.locations.includes(coordinate));
  }
}

class ShipFactory {
  static createShip(positions) {
    const locations = positions.map(([row, col]) => `${row}${col}`);
    return new Ship(locations);
  }
  
  static createRandomShip(board, shipLength) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      const { startRow, startCol } = this.generateRandomStart(orientation, boardSize, shipLength);
      const positions = this.getShipPositions(startRow, startCol, orientation, shipLength);
      
      if (this.canPlaceShip(board, positions)) {
        return this.createShip(positions);
      }
      attempts++;
    }
    
    throw new Error('Unable to place ship after maximum attempts');
  }
  
  static generateRandomStart(orientation, boardSize, shipLength) {
    if (orientation === 'horizontal') {
      return {
        startRow: Math.floor(Math.random() * boardSize),
        startCol: Math.floor(Math.random() * (boardSize - shipLength + 1))
      };
    } else {
      return {
        startRow: Math.floor(Math.random() * (boardSize - shipLength + 1)),
        startCol: Math.floor(Math.random() * boardSize)
      };
    }
  }
  
  static getShipPositions(startRow, startCol, orientation, shipLength) {
    return Array.from({length: shipLength}, (_, i) => {
      if (orientation === 'horizontal') {
        return [startRow, startCol + i];
      } else {
        return [startRow + i, startCol];
      }
    });
  }
  
  static canPlaceShip(board, positions) {
    const config = new GameConfig();
    const waterSymbol = config.get('symbols').water;
    
    return positions.every(([row, col]) => 
      board.isValidCoordinate(row, col) && 
      board.grid[row][col] === waterSymbol
    );
  }
}

// ============================================================================
// AI STRATEGY LAYER - Strategy Pattern
// ============================================================================
class AIStrategy {
  makeMove(gameState) {
    throw new Error('AI Strategy must implement makeMove method');
  }
}

class HuntStrategy extends AIStrategy {
  makeMove(gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    let guess;
    
    do {
      const row = Math.floor(Math.random() * boardSize);
      const col = Math.floor(Math.random() * boardSize);
      guess = `${row}${col}`;
    } while (gameState.cpuGuesses.has(guess));
    
    return { coordinate: guess, mode: 'hunt' };
  }
}

class TargetStrategy extends AIStrategy {
  constructor() {
    super();
    this.targetQueue = [];
  }
  
  addTargets(row, col, gameState) {
    const adjacentCells = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 }
    ];
    
    adjacentCells
      .filter(({r, c}) => this.isValidTarget(r, c, gameState))
      .map(({r, c}) => `${r}${c}`)
      .filter(coord => !this.targetQueue.includes(coord))
      .forEach(coord => this.targetQueue.push(coord));
  }
  
  isValidTarget(row, col, gameState) {
    const config = new GameConfig();
    const boardSize = config.get('boardSize');
    return row >= 0 && row < boardSize && 
           col >= 0 && col < boardSize && 
           !gameState.cpuGuesses.has(`${row}${col}`);
  }
  
  makeMove(gameState) {
    if (this.targetQueue.length === 0) {
      return new HuntStrategy().makeMove(gameState);
    }
    
    let guess;
    do {
      guess = this.targetQueue.shift();
      if (this.targetQueue.length === 0) {
        return new HuntStrategy().makeMove(gameState);
      }
    } while (gameState.cpuGuesses.has(guess) && this.targetQueue.length > 0);
    
    return { coordinate: guess, mode: 'target' };
  }
  
  reset() {
    this.targetQueue = [];
  }
}

class AIContext {
  constructor() {
    this.huntStrategy = new HuntStrategy();
    this.targetStrategy = new TargetStrategy();
    this.currentStrategy = this.huntStrategy;
  }
  
  switchToHunt() {
    this.currentStrategy = this.huntStrategy;
    this.targetStrategy.reset();
  }
  
  switchToTarget(row, col, gameState) {
    this.currentStrategy = this.targetStrategy;
    this.targetStrategy.addTargets(row, col, gameState);
  }
  
  makeMove(gameState) {
    return this.currentStrategy.makeMove(gameState);
  }
}

// ============================================================================
// COMMAND PATTERN - Game Actions
// ============================================================================
class Command {
  execute() {
    throw new Error('Command must implement execute method');
  }
  
  undo() {
    throw new Error('Command must implement undo method');
  }
}

class PlayerMoveCommand extends Command {
  constructor(coordinate, gameState) {
    super();
    this.coordinate = coordinate;
    this.gameState = gameState;
    this.wasHit = false;
    this.hitShip = null;
  }
  
  execute() {
    const config = new GameConfig();
    const [row, col] = [parseInt(this.coordinate[0]), parseInt(this.coordinate[1])];
    
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
}

class CPUMoveCommand extends Command {
  constructor(aiContext, gameState) {
    super();
    this.aiContext = aiContext;
    this.gameState = gameState;
    this.coordinate = null;
    this.wasHit = false;
    this.hitShip = null;
  }
  
  execute() {
    const config = new GameConfig();
    const move = this.aiContext.makeMove(this.gameState);
    this.coordinate = move.coordinate;
    
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
    
    console.log(`\n--- CPU's Turn ---`);
    return this.wasHit;
  }
}

// ============================================================================
// OBSERVER PATTERN - Game Events
// ============================================================================
class Observer {
  update(event, data) {
    throw new Error('Observer must implement update method');
  }
}

class GameStatsObserver extends Observer {
  constructor() {
    super();
    this.stats = {
      playerHits: 0,
      playerMisses: 0,
      cpuHits: 0,
      cpuMisses: 0,
      turnsPlayed: 0
    };
  }
  
  update(event, data) {
    switch(event) {
      case 'playerHit':
        this.stats.playerHits++;
        break;
      case 'playerMiss':
        this.stats.playerMisses++;
        break;
      case 'cpuHit':
        this.stats.cpuHits++;
        break;
      case 'cpuMiss':
        this.stats.cpuMisses++;
        break;
      case 'turnComplete':
        this.stats.turnsPlayed++;
        break;
      }
    }

  getStats() {
    return { ...this.stats };
  }
}

class EventEmitter {
  constructor() {
    this.observers = [];
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  notify(event, data) {
    this.observers.forEach(observer => observer.update(event, data));
  }
}

// ============================================================================
// STATE PATTERN - Game States
// ============================================================================
class GameState {
  constructor(context) {
    this.context = context;
  }
  
  handle() {
    throw new Error('GameState must implement handle method');
  }
}

class PlayingState extends GameState {
  handle() {
    this.context.displayBoards();
    this.context.requestPlayerInput();
  }
}

class GameOverState extends GameState {
  constructor(context, winner) {
    super(context);
    this.winner = winner;
  }
  
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
}

// ============================================================================
// GAME ORCHESTRATION LAYER
// ============================================================================
class Game {
  constructor() {
    this.config = new GameConfig();
    this.eventEmitter = new EventEmitter();
    this.statsObserver = new GameStatsObserver();
    this.aiContext = new AIContext();
    
    this.playerBoard = new GameBoard();
    this.cpuBoard = new GameBoard();
    
    this.playerGuesses = new Set();
    this.cpuGuesses = new Set();
    
    this.playerNumShips = this.config.get('numShips');
    this.cpuNumShips = this.config.get('numShips');
    
    this.currentState = new PlayingState(this);
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    this.setupObservers();
  }
  
  setupObservers() {
    this.eventEmitter.subscribe(this.statsObserver);
  }
  
  initialize() {
    console.log('Boards created.');
    this.placeShipsRandomly();
    console.log("\nLet's play Sea Battle!");
    console.log(`Try to sink the ${this.cpuNumShips} enemy ships.`);
  }
  
  placeShipsRandomly() {
    const numShips = this.config.get('numShips');
    const shipLength = this.config.get('shipLength');
    
    // Place player ships (visible)
    for (let i = 0; i < numShips; i++) {
      const ship = ShipFactory.createRandomShip(this.playerBoard, shipLength);
      this.playerBoard.placeShip(ship, true);
    }
    console.log(`${numShips} ships placed randomly for Player.`);
    
    // Place CPU ships (hidden)
    for (let i = 0; i < numShips; i++) {
      const ship = ShipFactory.createRandomShip(this.cpuBoard, shipLength);
      this.cpuBoard.placeShip(ship, false);
    }
    console.log(`${numShips} ships placed randomly for CPU.`);
  }
  
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
  
  requestPlayerInput() {
    this.rl.question('Enter your guess (e.g., 00): ', (answer) => {
      this.processPlayerTurn(answer);
    });
  }
  
  processPlayerTurn(input) {
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

    const playerCommand = new PlayerMoveCommand(input, {
      playerGuesses: this.playerGuesses,
      cpuBoard: this.cpuBoard,
      cpuNumShips: this.cpuNumShips
    });
    
    const playerHit = playerCommand.execute();
    this.cpuNumShips = playerCommand.gameState.cpuNumShips;
    
    this.eventEmitter.notify(playerHit ? 'playerHit' : 'playerMiss');
    
    if (this.checkGameOver()) return;
    
    this.processCPUTurn();
  }
  
  processCPUTurn() {
    const cpuCommand = new CPUMoveCommand(this.aiContext, {
      cpuGuesses: this.cpuGuesses,
      playerBoard: this.playerBoard,
      playerNumShips: this.playerNumShips
    });
    
    const cpuHit = cpuCommand.execute();
    this.playerNumShips = cpuCommand.gameState.playerNumShips;
    
    this.eventEmitter.notify(cpuHit ? 'cpuHit' : 'cpuMiss');
    this.eventEmitter.notify('turnComplete');
    
    if (this.checkGameOver()) return;
    
    this.currentState.handle();
  }
  
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
  
  endGame() {
    console.log('\nGame Statistics:');
    console.log(this.statsObserver.getStats());
    this.rl.close();
  }
  
  start() {
    this.initialize();
    this.currentState.handle();
  }
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================
const game = new Game();
game.start();
