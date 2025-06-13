const GameBoard = require('../../src/entities/GameBoard');
const Ship = require('../../src/entities/Ship');
const GameConfig = require('../../src/config/GameConfig');

describe('GameBoard', () => {
  let board;
  let config;

  beforeEach(() => {
    board = new GameBoard(10);
    config = new GameConfig();
  });

  describe('initialization', () => {
    test('creates board with specified size', () => {
      expect(board.size).toBe(10);
      expect(board.grid.length).toBe(10);
      expect(board.grid[0].length).toBe(10);
    });

    test('creates board with default size from config', () => {
      board = new GameBoard();
      expect(board.size).toBe(config.get('boardSize'));
    });

    test('initializes empty collections', () => {
      expect(board.ships).toEqual([]);
      expect(board.misses.size).toBe(0);
      expect(board.hits.size).toBe(0);
      expect(board.hitCount).toBe(0);
      expect(board.missCount).toBe(0);
      expect(board.visibleShips.size).toBe(0);
    });

    test('initializes grid with water symbols', () => {
      const waterSymbol = config.get('symbols').water;
      board.grid.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBe(waterSymbol);
        });
      });
    });
  });

  describe('coordinate handling', () => {
    test('validates string coordinates', () => {
      expect(board.isValidCoordinate('00')).toBe(true);
      expect(board.isValidCoordinate('99')).toBe(true);
      expect(board.isValidCoordinate('XX')).toBe(false);
      expect(board.isValidCoordinate('100')).toBe(false);
    });

    test('validates numeric coordinates', () => {
      expect(board.isValidCoordinate(0, 0)).toBe(true);
      expect(board.isValidCoordinate(9, 9)).toBe(true);
      expect(board.isValidCoordinate(-1, 0)).toBe(false);
      expect(board.isValidCoordinate(10, 0)).toBe(false);
    });

    test('parses valid coordinates', () => {
      expect(board.parseCoordinate('05')).toEqual({ row: 0, col: 5 });
      expect(board.parseCoordinate('92')).toEqual({ row: 9, col: 2 });
    });

    test('handles invalid coordinate parsing', () => {
      expect(board.parseCoordinate('XX')).toEqual({ row: null, col: null });
      expect(board.parseCoordinate('')).toEqual({ row: null, col: null });
      expect(board.parseCoordinate('100')).toEqual({ row: null, col: null });
      expect(board.parseCoordinate(null)).toEqual({ row: null, col: null });
    });

    test('formats coordinates correctly', () => {
      expect(board.formatCoordinate(0, 5)).toBe('05');
      expect(board.formatCoordinate(9, 2)).toBe('92');
    });
  });

  describe('ship placement', () => {
    test('places ship with valid coordinates', () => {
      const ship = new Ship(3, 0, 0, true);
      expect(() => board.placeShip(ship)).not.toThrow();
      expect(board.ships.length).toBe(1);
    });

    test('places ship with visibility', () => {
      const ship = new Ship(3, 0, 0, true);
      board.placeShip(ship, true);
      expect(board.visibleShips.has(ship.id)).toBe(true);
      expect(board.grid[0][0]).toBe(config.get('symbols').ship);
      expect(board.grid[0][1]).toBe(config.get('symbols').ship);
      expect(board.grid[0][2]).toBe(config.get('symbols').ship);
    });

    test('rejects invalid ship placement', () => {
      const ship = new Ship(3, 8, 8, true);
      expect(() => board.placeShip(ship)).toThrow('Invalid ship placement');
    });

    test('rejects overlapping ships', () => {
      const ship1 = new Ship(3, 0, 0, true);
      const ship2 = new Ship(3, 0, 1, true);
      board.placeShip(ship1);
      expect(() => board.placeShip(ship2)).toThrow('Invalid ship placement');
    });

    test('rejects ships too close to each other', () => {
      const ship1 = new Ship(3, 0, 0, true);
      const ship2 = new Ship(3, 1, 0, true);
      board.placeShip(ship1);
      expect(() => board.placeShip(ship2)).toThrow('Invalid ship placement');
    });

    test('accepts ships with proper spacing', () => {
      const ship1 = new Ship(3, 0, 0, true);
      const ship2 = new Ship(3, 2, 0, true);
      board.placeShip(ship1);
      expect(() => board.placeShip(ship2)).not.toThrow();
    });

    test('handles non-Ship objects', () => {
      const shipData = { length: 3, row: 0, col: 0, isHorizontal: true };
      expect(() => board.placeShip(shipData)).not.toThrow();
      expect(board.ships[0] instanceof Ship).toBe(true);
    });

    test('rejects ships extending beyond board boundaries', () => {
      const horizontalShip = new Ship(3, 0, 8, true);
      expect(() => board.placeShip(horizontalShip)).toThrow('Invalid ship placement');

      const verticalShip = new Ship(3, 8, 0, false);
      expect(() => board.placeShip(verticalShip)).toThrow('Invalid ship placement');
    });
  });

  describe('attack handling', () => {
    let ship;

    beforeEach(() => {
      ship = new Ship(3, 0, 0, true);
      board.placeShip(ship);
    });

    test('registers successful hit', () => {
      expect(board.receiveAttack('00')).toBe(true);
      expect(board.hits.has('00')).toBe(true);
      expect(board.grid[0][0]).toBe(config.get('symbols').hit);
      expect(board.hitCount).toBe(1);
    });

    test('registers miss', () => {
      expect(board.receiveAttack('55')).toBe(false);
      expect(board.misses.has('55')).toBe(true);
      expect(board.grid[5][5]).toBe(config.get('symbols').miss);
      expect(board.missCount).toBe(1);
    });

    test('rejects repeated attacks', () => {
      board.receiveAttack('00');
      expect(() => board.receiveAttack('00')).toThrow('Coordinate already attacked');
    });

    test('rejects invalid coordinates', () => {
      expect(() => board.receiveAttack('XX')).toThrow('Invalid coordinate');
    });
  });

  describe('game state', () => {
    let ship1;
    let ship2;

    beforeEach(() => {
      ship1 = new Ship(2, 0, 0, true);
      ship2 = new Ship(2, 2, 0, true);
      board.placeShip(ship1);
      board.placeShip(ship2);
    });

    test('tracks game statistics', () => {
      board.receiveAttack('00');
      board.receiveAttack('01');
      board.receiveAttack('55');

      const stats = board.getStats();
      expect(stats).toEqual({
        size: 10,
        totalShips: 2,
        sunkShips: 1,
        remainingShips: 1,
        totalHits: 2,
        totalMisses: 1,
        accuracy: (2 / 3) * 100
      });
    });

    test('detects when all ships are sunk', () => {
      expect(board.allShipsSunk()).toBe(false);
      board.receiveAttack('00');
      board.receiveAttack('01');
      expect(board.allShipsSunk()).toBe(false);
      board.receiveAttack('20');
      board.receiveAttack('21');
      expect(board.allShipsSunk()).toBe(true);
    });

    test('resets board state', () => {
      board.receiveAttack('00');
      board.receiveAttack('55');
      board.reset();

      expect(board.ships).toEqual([]);
      expect(board.hits.size).toBe(0);
      expect(board.misses.size).toBe(0);
      expect(board.hitCount).toBe(0);
      expect(board.missCount).toBe(0);
      expect(board.visibleShips.size).toBe(0);
      expect(board.grid[0][0]).toBe(config.get('symbols').water);
    });
  });

  describe('state restoration', () => {
    test('restores complete board state', () => {
      // Setup initial state
      const ship = new Ship(3, 0, 0, true);
      board.placeShip(ship, true);
      board.receiveAttack('00');
      board.receiveAttack('55');

      // Create new board and restore state
      const newBoard = new GameBoard(10);
      const state = {
        boardState: board.grid.map(row => [...row]),
        ships: board.ships.map(s => s.clone()),
        hits: Array.from(board.hits),
        misses: Array.from(board.misses),
        visibleShips: Array.from(board.visibleShips)
      };
      newBoard.restoreState(state);

      // Verify state was restored correctly
      expect(newBoard.grid).toEqual(board.grid);
      expect(newBoard.ships.length).toBe(board.ships.length);
      expect(newBoard.hits.size).toBe(board.hits.size);
      expect(newBoard.misses.size).toBe(board.misses.size);
      expect(newBoard.hitCount).toBe(board.hitCount);
      expect(newBoard.missCount).toBe(board.missCount);
      expect(newBoard.visibleShips.size).toBe(board.visibleShips.size);

      // Verify ship visibility is restored correctly
      const restoredShip = newBoard.ships[0];
      expect(newBoard.visibleShips.has(restoredShip.id)).toBe(true);
      expect(newBoard.grid[0][1]).toBe(config.get('symbols').ship); // Unhit part of the ship
      expect(newBoard.grid[0][0]).toBe(config.get('symbols').hit); // Hit part of the ship
    });
  });

  describe('ship queries', () => {
    let ship;

    beforeEach(() => {
      ship = new Ship(3, 0, 0, true);
      board.placeShip(ship);
    });

    test('finds ship at coordinate', () => {
      const foundShip = board.getShipAt('00');
      expect(foundShip).toBeTruthy();
      expect(foundShip.getCoordinates()).toEqual(ship.getCoordinates());
      expect(foundShip.id).toBe(ship.id);
      expect(board.getShipAt('03')).toBeNull();
    });

    test('gets all ships', () => {
      const ships = board.getShips();
      expect(ships).toHaveLength(1);
      const foundShip = ships[0];
      expect(foundShip.getCoordinates()).toEqual(ship.getCoordinates());
      expect(foundShip.id).toBe(ship.id);
    });
  });

  describe('board display', () => {
    test('generates correct display format', () => {
      const display = board.display();
      expect(display[0]).toBe('  0 1 2 3 4 5 6 7 8 9');
      expect(display[1]).toBe(`0 ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water} ${config.get('symbols').water}`);
      expect(display.length).toBe(11); // Header + 10 rows
    });
  });
}); 