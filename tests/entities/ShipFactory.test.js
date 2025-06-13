const ShipFactory = require('../../src/entities/ShipFactory');
const Ship = require('../../src/entities/Ship');
const GameConfig = require('../../src/config/GameConfig');

describe('ShipFactory', () => {
  let factory;
  let board;
  let config;

  beforeEach(() => {
    factory = new ShipFactory();
    config = new GameConfig();
    board = {
      size: 10,
      grid: Array(10).fill(null).map(() => Array(10).fill('~')),
      isValidCoordinate: jest.fn((row, col) => 
        row >= 0 && row < 10 && col >= 0 && col < 10
      ),
      parseCoordinate: jest.fn((coord) => {
        const row = parseInt(coord[0]);
        const col = parseInt(coord[1]);
        return { row, col };
      }),
      getShipAt: jest.fn()
    };
  });

  describe('Instance Methods', () => {
    test('should create ship from locations', () => {
      const locations = ['00', '01', '02'];
      const ship = factory.createShip(locations);
      expect(ship).toBeInstanceOf(Ship);
      expect(ship.locations).toEqual(locations);
    });

    test('should generate ships for game', () => {
      const ships = factory.generateShips();
      const numShips = config.get('numShips');
      const shipLength = config.get('shipLength');
      
      expect(ships).toHaveLength(numShips);
      ships.forEach(ship => {
        expect(ship).toBeInstanceOf(Ship);
        expect(ship.locations).toHaveLength(shipLength);
      });
    });

    test('should validate ship placement', () => {
      const locations = ['00', '01', '02'];
      expect(factory.isValidPlacement(locations)).toBe(true);

      // Test invalid length
      const invalidLength = ['00', '01', '02', '03', '04'];
      expect(factory.isValidPlacement(invalidLength)).toBe(false);

      // Test out of bounds
      const outOfBounds = ['100', '101', '102'];
      expect(factory.isValidPlacement(outOfBounds)).toBe(false);

      // Test non-consecutive
      const nonConsecutive = ['00', '02', '04'];
      expect(factory.isValidPlacement(nonConsecutive)).toBe(false);
    });

    test('should check for ship overlap', () => {
      const existingShips = [
        new Ship(['00', '01', '02']),
        new Ship(['20', '21', '22'])
      ];

      // Test overlap
      const overlapping = ['00', '01', '03'];
      expect(factory.hasOverlap(overlapping, existingShips)).toBe(true);

      // Test no overlap
      const nonOverlapping = ['10', '11', '12'];
      expect(factory.hasOverlap(nonOverlapping, existingShips)).toBe(false);
    });
  });

  describe('Static Methods', () => {
    test('should create ship from positions', () => {
      const positions = [[0, 0], [0, 1], [0, 2]];
      const ship = ShipFactory.createShip(positions);
      expect(ship).toBeInstanceOf(Ship);
      expect(ship.locations).toEqual(['00', '01', '02']);
    });

    test('should create random ship', () => {
      const shipLength = 3;
      const ship = ShipFactory.createRandomShip(board, shipLength);
      expect(ship).toBeInstanceOf(Ship);
      expect(ship.locations).toHaveLength(shipLength);
    });

    test('should throw error if cannot place random ship', () => {
      // Mock board to be full
      board.grid = Array(10).fill(null).map(() => Array(10).fill('S'));
      expect(() => ShipFactory.createRandomShip(board, 3))
        .toThrow('Unable to place ship after maximum attempts');
    });

    test('should generate valid random start positions', () => {
      const boardSize = 10;
      const shipLength = 3;

      // Test horizontal
      const horizontal = ShipFactory.generateRandomStart('horizontal', boardSize, shipLength);
      expect(horizontal.startRow).toBeGreaterThanOrEqual(0);
      expect(horizontal.startRow).toBeLessThan(boardSize);
      expect(horizontal.startCol).toBeGreaterThanOrEqual(0);
      expect(horizontal.startCol).toBeLessThan(boardSize - shipLength + 1);

      // Test vertical
      const vertical = ShipFactory.generateRandomStart('vertical', boardSize, shipLength);
      expect(vertical.startRow).toBeGreaterThanOrEqual(0);
      expect(vertical.startRow).toBeLessThan(boardSize - shipLength + 1);
      expect(vertical.startCol).toBeGreaterThanOrEqual(0);
      expect(vertical.startCol).toBeLessThan(boardSize);
    });

    test('should get ship positions', () => {
      const shipLength = 3;
      
      // Test horizontal
      const horizontal = ShipFactory.getShipPositions(0, 0, 'horizontal', shipLength);
      expect(horizontal).toEqual([[0, 0], [0, 1], [0, 2]]);

      // Test vertical
      const vertical = ShipFactory.getShipPositions(0, 0, 'vertical', shipLength);
      expect(vertical).toEqual([[0, 0], [1, 0], [2, 0]]);
    });

    test('should validate ship placement', () => {
      const ship = new Ship(['00', '01', '02']);
      
      // Test valid placement
      board.getShipAt.mockReturnValue(null);
      const validResult = ShipFactory.validateShipPlacement(ship, board);
      expect(validResult.isValid).toBe(true);
      expect(validResult.reasons).toHaveLength(0);

      // Test out of bounds
      const outOfBoundsShip = new Ship(['90', '91', '92', '93', '94']);
      const outOfBoundsResult = ShipFactory.validateShipPlacement(outOfBoundsShip, board);
      expect(outOfBoundsResult.isValid).toBe(false);
      expect(outOfBoundsResult.reasons).toContain('Ship length 5 exceeds maximum 3');

      // Test overlap
      board.getShipAt.mockReturnValue(new Ship(['00']));
      const overlapResult = ShipFactory.validateShipPlacement(ship, board);
      expect(overlapResult.isValid).toBe(false);
      expect(overlapResult.reasons[0]).toMatch(/Position 00 overlaps with ship/);
    });

    test('should create ship with pattern', () => {
      const startRow = 0;
      const startCol = 0;
      const length = 3;

      // Test horizontal pattern
      const horizontal = ShipFactory.createShipWithPattern('horizontal', startRow, startCol, length);
      expect(horizontal.locations).toEqual(['00', '01', '02']);

      // Test vertical pattern
      const vertical = ShipFactory.createShipWithPattern('vertical', startRow, startCol, length);
      expect(vertical.locations).toEqual(['00', '10', '20']);

      // Test diagonal pattern
      const diagonal = ShipFactory.createShipWithPattern('diagonal', startRow, startCol, length);
      expect(diagonal.locations).toEqual(['00', '11', '22']);

      // Test invalid pattern
      expect(() => ShipFactory.createShipWithPattern('invalid', startRow, startCol, length))
        .toThrow('Unknown pattern: invalid');
    });

    test('should check if ship can be placed', () => {
      // Test valid placement
      const validPositions = [[0, 0], [0, 1], [0, 2]];
      expect(ShipFactory.canPlaceShip(board, validPositions)).toBe(true);

      // Test invalid placement (out of bounds)
      const invalidPositions = [[10, 0], [10, 1], [10, 2]];
      expect(ShipFactory.canPlaceShip(board, invalidPositions)).toBe(false);

      // Test invalid placement (occupied space)
      board.grid[0][0] = 'S';
      expect(ShipFactory.canPlaceShip(board, validPositions)).toBe(false);
    });
  });
}); 