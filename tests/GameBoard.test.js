const GameBoard = require('../src/entities/GameBoard');
const Ship = require('../src/entities/Ship');

// Mock GameConfig to avoid singleton issues in tests
jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key) => {
      const config = {
        boardSize: 10,
        symbols: { water: '~', ship: 'S', hit: 'X', miss: 'O' }
      };
      return config[key];
    }
  }));
});

describe('GameBoard', () => {
  let board;

  beforeEach(() => {
    board = new GameBoard();
  });

  test('should create board with correct size', () => {
    expect(board.size).toBe(10);
    expect(board.grid.length).toBe(10);
    expect(board.grid[0].length).toBe(10);
    expect(board.ships.length).toBe(0);
  });

  test('should initialize grid with water symbols', () => {
    board.grid.forEach(row => {
      row.forEach(cell => {
        expect(cell).toBe('~');
      });
    });
  });

  test('should validate coordinates correctly', () => {
    expect(board.isValidCoordinate(0, 0)).toBe(true);
    expect(board.isValidCoordinate(5, 5)).toBe(true);
    expect(board.isValidCoordinate(9, 9)).toBe(true);
    
    expect(board.isValidCoordinate(-1, 0)).toBe(false);
    expect(board.isValidCoordinate(0, -1)).toBe(false);
    expect(board.isValidCoordinate(10, 0)).toBe(false);
    expect(board.isValidCoordinate(0, 10)).toBe(false);
  });

  test('should place ship invisibly by default', () => {
    const ship = new Ship(['00', '01', '02']);
    board.placeShip(ship);
    
    expect(board.ships.length).toBe(1);
    expect(board.ships[0]).toBe(ship);
    expect(board.grid[0][0]).toBe('~'); // Should remain water
    expect(board.grid[0][1]).toBe('~');
    expect(board.grid[0][2]).toBe('~');
  });

  test('should place ship visibly when specified', () => {
    const ship = new Ship(['00', '01', '02']);
    board.placeShip(ship, true);
    
    expect(board.ships.length).toBe(1);
    expect(board.grid[0][0]).toBe('S');
    expect(board.grid[0][1]).toBe('S');
    expect(board.grid[0][2]).toBe('S');
  });

  test('should mark hits correctly', () => {
    board.markHit(5, 5);
    
    expect(board.grid[5][5]).toBe('X');
    expect(board.hitCount).toBe(1);
  });

  test('should mark misses correctly', () => {
    board.markMiss(3, 7);
    
    expect(board.grid[3][7]).toBe('O');
    expect(board.missCount).toBe(1);
  });

  test('should parse coordinates correctly', () => {
    expect(board.parseCoordinate('05')).toEqual([0, 5]);
    expect(board.parseCoordinate('34')).toEqual([3, 4]);
    expect(board.parseCoordinate('99')).toEqual([9, 9]);
  });

  test('should display board correctly', () => {
    board.markHit(0, 0);
    board.markMiss(1, 1);
    
    const display = board.display();
    
    expect(display[0]).toBe('  0 1 2 3 4 5 6 7 8 9');
    expect(display[1]).toBe('0 X ~ ~ ~ ~ ~ ~ ~ ~ ~');
    expect(display[2]).toBe('1 ~ O ~ ~ ~ ~ ~ ~ ~ ~');
  });

  test('should find ship at coordinate', () => {
    const ship1 = new Ship(['00', '01']);
    const ship2 = new Ship(['55', '56']);
    
    board.placeShip(ship1);
    board.placeShip(ship2);
    
    expect(board.getShipAt('00')).toBe(ship1);
    expect(board.getShipAt('01')).toBe(ship1);
    expect(board.getShipAt('55')).toBe(ship2);
    expect(board.getShipAt('99')).toBeUndefined();
  });

  test('should return all ships', () => {
    const ship1 = new Ship(['00']);
    const ship2 = new Ship(['11']);
    
    board.placeShip(ship1);
    board.placeShip(ship2);
    
    const ships = board.getShips();
    expect(ships).toHaveLength(2);
    expect(ships).toContain(ship1);
    expect(ships).toContain(ship2);
    expect(ships).not.toBe(board.ships); // Should return copy
  });

  test('should calculate board statistics', () => {
    const ship1 = new Ship(['00', '01']);
    const ship2 = new Ship(['22', '23']);
    
    board.placeShip(ship1);
    board.placeShip(ship2);
    
    ship1.hit('00');
    ship1.hit('01'); // Ship1 is sunk
    ship2.hit('22'); // Ship2 is partially hit
    
    board.markHit(0, 0);
    board.markHit(0, 1);
    board.markHit(2, 2);
    board.markMiss(5, 5);
    board.markMiss(6, 6);
    
    const stats = board.getStats();
    
    expect(stats.size).toBe(10);
    expect(stats.totalShips).toBe(2);
    expect(stats.sunkShips).toBe(1);
    expect(stats.remainingShips).toBe(1);
    expect(stats.totalHits).toBe(3);
    expect(stats.totalMisses).toBe(2);
    expect(stats.accuracy).toBeCloseTo(60, 1); // 3/(3+2) = 60%
  });

  test('should detect when all ships are sunk', () => {
    const ship1 = new Ship(['00']);
    const ship2 = new Ship(['11']);
    
    board.placeShip(ship1);
    board.placeShip(ship2);
    
    expect(board.areAllShipsSunk()).toBe(false);
    
    ship1.hit('00');
    expect(board.areAllShipsSunk()).toBe(false);
    
    ship2.hit('11');
    expect(board.areAllShipsSunk()).toBe(true);
  });

  test('should reset board to initial state', () => {
    const ship = new Ship(['00']);
    board.placeShip(ship, true);
    board.markHit(1, 1);
    board.markMiss(2, 2);
    
    board.reset();
    
    expect(board.ships.length).toBe(0);
    expect(board.hitCount).toBe(0);
    expect(board.missCount).toBe(0);
    expect(board.grid[0][0]).toBe('~');
    expect(board.grid[1][1]).toBe('~');
    expect(board.grid[2][2]).toBe('~');
  });

  test('should handle custom board size', () => {
    const customBoard = new GameBoard(5);
    
    expect(customBoard.size).toBe(5);
    expect(customBoard.grid.length).toBe(5);
    expect(customBoard.grid[0].length).toBe(5);
  });

  test('should handle empty board stats', () => {
    const stats = board.getStats();
    
    expect(stats.totalShips).toBe(0);
    expect(stats.sunkShips).toBe(0);
    expect(stats.accuracy).toBe(0);
  });
}); 