const readline = require('readline');

// Game Configuration
const GAME_CONFIG = {
  boardSize: 10,
  numShips: 3,
  shipLength: 3
};

const SYMBOLS = {
  water: '~',
  ship: 'S',
  hit: 'X',
  miss: 'O'
};

const CPU_MODES = {
  hunt: 'hunt',
  target: 'target'
};

class Ship {
  constructor(locations = []) {
    this.locations = locations;
    this.hits = new Array(locations.length).fill('');
  }

  isHit(coordinate) {
    const index = this.locations.indexOf(coordinate);
    return index >= 0 && this.hits[index] === 'hit';
  }

  hit(coordinate) {
    const index = this.locations.indexOf(coordinate);
    if (index >= 0) {
      this.hits[index] = 'hit';
      return true;
    }
    return false;
  }

  isSunk() {
    return this.hits.every(hit => hit === 'hit');
  }
}

class GameBoard {
  constructor(size = GAME_CONFIG.boardSize) {
    this.size = size;
    this.grid = Array(size).fill(null).map(() => Array(size).fill(SYMBOLS.water));
  }

  display(isPlayerBoard = false) {
    const header = '  ' + Array.from({length: this.size}, (_, i) => i).join(' ');
    const rows = this.grid.map((row, i) => `${i} ${row.join(' ')}`);
    return [header, ...rows];
  }

  isValidCoordinate(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  markHit(row, col) {
    this.grid[row][col] = SYMBOLS.hit;
  }

  markMiss(row, col) {
    this.grid[row][col] = SYMBOLS.miss;
  }

  markShip(row, col) {
    this.grid[row][col] = SYMBOLS.ship;
  }
}

class GameState {
  constructor() {
    this.playerShips = [];
    this.cpuShips = [];
    this.playerNumShips = GAME_CONFIG.numShips;
    this.cpuNumShips = GAME_CONFIG.numShips;
    this.guesses = new Set();
    this.cpuGuesses = new Set();
    this.cpuMode = CPU_MODES.hunt;
    this.cpuTargetQueue = [];
    this.board = new GameBoard(); // Opponent board (player's view)
    this.playerBoard = new GameBoard(); // Player's board
  }

  isGameOver() {
    return this.playerNumShips === 0 || this.cpuNumShips === 0;
  }

  hasPlayerWon() {
    return this.cpuNumShips === 0;
  }

  hasPlayerLost() {
    return this.playerNumShips === 0;
  }
}

class ShipPlacer {
  static placeShipsRandomly(board, shipsArray, numberOfShips) {
    let placedShips = 0;
    
    while (placedShips < numberOfShips) {
      const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const { startRow, startCol } = this.generateRandomStart(orientation);
      
      if (this.canPlaceShip(board, startRow, startCol, orientation)) {
        const ship = this.createShip(board, startRow, startCol, orientation);
        shipsArray.push(ship);
        placedShips++;
      }
    }
    
    console.log(`${numberOfShips} ships placed randomly for ${board === gameState.playerBoard ? 'Player' : 'CPU'}.`);
  }

  static generateRandomStart(orientation) {
    const { boardSize, shipLength } = GAME_CONFIG;
    
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

  static canPlaceShip(board, startRow, startCol, orientation) {
    const positions = this.getShipPositions(startRow, startCol, orientation);
    
    return positions.every(([row, col]) => 
      board.isValidCoordinate(row, col) && 
      board.grid[row][col] === SYMBOLS.water
    );
  }

  static getShipPositions(startRow, startCol, orientation) {
    return Array.from({length: GAME_CONFIG.shipLength}, (_, i) => {
      if (orientation === 'horizontal') {
        return [startRow, startCol + i];
      } else {
        return [startRow + i, startCol];
      }
    });
  }

  static createShip(board, startRow, startCol, orientation) {
    const positions = this.getShipPositions(startRow, startCol, orientation);
    const locations = positions.map(([row, col]) => `${row}${col}`);
    
    // Mark ships on player board only
    if (board === gameState.playerBoard) {
      positions.forEach(([row, col]) => board.markShip(row, col));
    }
    
    return new Ship(locations);
  }
}

class PlayerTurn {
  static process(guess) {
    if (!this.validateInput(guess)) return false;
    
    const [row, col] = this.parseCoordinates(guess);
    
    if (gameState.guesses.has(guess)) {
      console.log('You already guessed that location!');
      return false;
    }
    
    gameState.guesses.add(guess);
    
    const hitShip = gameState.cpuShips.find(ship => ship.locations.includes(guess));
    
    if (hitShip && !hitShip.isHit(guess)) {
      hitShip.hit(guess);
      gameState.board.markHit(row, col);
      console.log('PLAYER HIT!');
      
      if (hitShip.isSunk()) {
        console.log('You sunk an enemy battleship!');
        gameState.cpuNumShips--;
      }
    } else {
      gameState.board.markMiss(row, col);
      console.log('PLAYER MISS.');
    }
    
    return true;
  }

  static validateInput(guess) {
    if (!guess || guess.length !== 2) {
      console.log('Oops, input must be exactly two digits (e.g., 00, 34, 98).');
      return false;
    }

    const [row, col] = this.parseCoordinates(guess);
    const { boardSize } = GAME_CONFIG;

    if (isNaN(row) || isNaN(col) || row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      console.log(`Oops, please enter valid row and column numbers between 0 and ${boardSize - 1}.`);
      return false;
    }

    return true;
  }

  static parseCoordinates(guess) {
    return [parseInt(guess[0]), parseInt(guess[1])];
  }
}

class CPUTurn {
  static process() {
    console.log("\n--- CPU's Turn ---");
    
    const guess = this.generateGuess();
    const [row, col] = [parseInt(guess[0]), parseInt(guess[1])];
    
    gameState.cpuGuesses.add(guess);
    
    const hitShip = gameState.playerShips.find(ship => ship.locations.includes(guess));
    
    if (hitShip) {
      hitShip.hit(guess);
      gameState.playerBoard.markHit(row, col);
      console.log(`CPU HIT at ${guess}!`);
      
      if (hitShip.isSunk()) {
        console.log('CPU sunk your battleship!');
        gameState.playerNumShips--;
        this.resetToHuntMode();
      } else {
        this.switchToTargetMode(row, col);
      }
    } else {
      gameState.playerBoard.markMiss(row, col);
      console.log(`CPU MISS at ${guess}.`);
      
      if (gameState.cpuMode === CPU_MODES.target && gameState.cpuTargetQueue.length === 0) {
        gameState.cpuMode = CPU_MODES.hunt;
      }
    }
  }

  static generateGuess() {
    if (gameState.cpuMode === CPU_MODES.target && gameState.cpuTargetQueue.length > 0) {
      let guess;
      do {
        guess = gameState.cpuTargetQueue.shift();
        if (gameState.cpuTargetQueue.length === 0) {
          gameState.cpuMode = CPU_MODES.hunt;
        }
      } while (gameState.cpuGuesses.has(guess) && gameState.cpuTargetQueue.length > 0);
      
      if (!gameState.cpuGuesses.has(guess)) {
        console.log(`CPU targets: ${guess}`);
        return guess;
      }
    }
    
    // Hunt mode - random guess
    let guess;
    do {
      const row = Math.floor(Math.random() * GAME_CONFIG.boardSize);
      const col = Math.floor(Math.random() * GAME_CONFIG.boardSize);
      guess = `${row}${col}`;
    } while (gameState.cpuGuesses.has(guess));
    
    return guess;
  }

  static switchToTargetMode(row, col) {
    gameState.cpuMode = CPU_MODES.target;
    
    const adjacentCells = [
      { r: row - 1, c: col },     // North
      { r: row + 1, c: col },     // South
      { r: row, c: col - 1 },     // West
      { r: row, c: col + 1 }      // East
    ];
    
    adjacentCells
      .filter(({r, c}) => this.isValidTarget(r, c))
      .map(({r, c}) => `${r}${c}`)
      .filter(guess => !gameState.cpuTargetQueue.includes(guess))
      .forEach(guess => gameState.cpuTargetQueue.push(guess));
  }

  static isValidTarget(row, col) {
    return gameState.board.isValidCoordinate(row, col) && 
           !gameState.cpuGuesses.has(`${row}${col}`);
  }

  static resetToHuntMode() {
    gameState.cpuMode = CPU_MODES.hunt;
    gameState.cpuTargetQueue = [];
  }
}

class GameDisplay {
  static printBoard() {
    console.log('\n   --- OPPONENT BOARD ---          --- YOUR BOARD ---');
    
    const opponentRows = gameState.board.display();
    const playerRows = gameState.playerBoard.display(true);
    
    opponentRows.forEach((opponentRow, index) => {
      const combinedRow = `${opponentRow}     ${playerRows[index]}`;
      console.log(combinedRow);
    });
    
    console.log('\n');
  }
}

class Game {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  initialize() {
    console.log('Boards created.');
    
    ShipPlacer.placeShipsRandomly(gameState.playerBoard, gameState.playerShips, gameState.playerNumShips);
    ShipPlacer.placeShipsRandomly(gameState.board, gameState.cpuShips, gameState.cpuNumShips);
    
    console.log("\nLet's play Sea Battle!");
    console.log(`Try to sink the ${gameState.cpuNumShips} enemy ships.`);
  }

  gameLoop() {
    if (gameState.hasPlayerWon()) {
      console.log('\n*** CONGRATULATIONS! You sunk all enemy battleships! ***');
      GameDisplay.printBoard();
      this.rl.close();
      return;
    }
    
    if (gameState.hasPlayerLost()) {
      console.log('\n*** GAME OVER! The CPU sunk all your battleships! ***');
      GameDisplay.printBoard();
      this.rl.close();
      return;
    }

    GameDisplay.printBoard();
    
    this.rl.question('Enter your guess (e.g., 00): ', (answer) => {
      const playerGuessed = PlayerTurn.process(answer);

      if (playerGuessed) {
        if (gameState.hasPlayerWon()) {
          this.gameLoop();
          return;
        }

        CPUTurn.process();

        if (gameState.hasPlayerLost()) {
          this.gameLoop();
          return;
        }
      }

      this.gameLoop();
    });
  }

  start() {
    this.initialize();
    this.gameLoop();
  }
}

// Global game state
const gameState = new GameState();

// Start the game
const game = new Game();
game.start();
