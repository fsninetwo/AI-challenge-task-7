const Ship = require('../../src/entities/Ship');

describe('Ship', () => {
  describe('constructor', () => {
    test('creates ship with locations array', () => {
      const locations = ['00', '01', '02'];
      const ship = new Ship(locations);
      expect(ship.getCoordinates()).toEqual(locations);
      expect(ship.length).toBe(3);
      expect(ship.id).toMatch(/^[a-z0-9]{9}$/);
      expect(ship.createdAt).toBeInstanceOf(Date);
    });

    test('creates ship with length and position', () => {
      const ship = new Ship(3, 0, 0, true);
      expect(ship.getCoordinates()).toEqual(['00', '01', '02']);
      expect(ship.length).toBe(3);
      expect(ship.row).toBe(0);
      expect(ship.col).toBe(0);
      expect(ship.isHorizontal).toBe(true);
    });

    test('creates vertical ship with length and position', () => {
      const ship = new Ship(3, 0, 0, false);
      expect(ship.getCoordinates()).toEqual(['00', '10', '20']);
      expect(ship.length).toBe(3);
      expect(ship.row).toBe(0);
      expect(ship.col).toBe(0);
      expect(ship.isHorizontal).toBe(false);
    });
  });

  describe('hit management', () => {
    let ship;

    beforeEach(() => {
      ship = new Ship(['00', '01', '02']);
    });

    test('registers hits correctly', () => {
      expect(ship.hit('00')).toBe(true);
      expect(ship.hit('01')).toBe(true);
      expect(ship.hit('03')).toBe(false);
      expect(ship.hits.size).toBe(2);
    });

    test('tracks hit status', () => {
      ship.hit('00');
      expect(ship.isHit('00')).toBe(true);
      expect(ship.isHit('01')).toBe(false);
    });

    test('determines sunk status', () => {
      expect(ship.isSunk()).toBe(false);
      ship.hit('00');
      ship.hit('01');
      expect(ship.isSunk()).toBe(false);
      ship.hit('02');
      expect(ship.isSunk()).toBe(true);
    });

    test('validates coordinates', () => {
      expect(ship.isValidCoordinate('00')).toBe(true);
      expect(ship.isValidCoordinate('03')).toBe(false);
    });

    test('gets unhit locations', () => {
      ship.hit('00');
      expect(ship.getUnhitLocations()).toEqual(['01', '02']);
      ship.hit('02');
      expect(ship.getUnhitLocations()).toEqual(['01']);
      ship.hit('01');
      expect(ship.getUnhitLocations()).toEqual([]);
    });
  });

  describe('status reporting', () => {
    let ship;

    beforeEach(() => {
      ship = new Ship(['00', '01', '02']);
      // Mock Date for consistent testing
      jest.useFakeTimers();
      const mockDate = new Date(2024, 0, 1);
      jest.setSystemTime(mockDate);
      ship.createdAt = mockDate;
      ship.id = 'test123456'; // Set fixed ID for testing
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('gets comprehensive status', () => {
      ship.hit('00');
      ship.hit('01');

      expect(ship.getStatus()).toEqual({
        id: 'test123456',
        locations: ['00', '01', '02'],
        hits: ['00', '01'],
        isSunk: false,
        hitPercentage: (2 / 3) * 100,
        remainingHits: 1,
        createdAt: new Date(2024, 0, 1)
      });
    });

    test('gets ship length', () => {
      expect(ship.getLength()).toBe(3);
    });
  });

  describe('coordinate calculation', () => {
    test('calculates horizontal coordinates correctly', () => {
      const ship = new Ship(4, 1, 2, true);
      expect(ship.calculateCoordinates()).toEqual(['12', '13', '14', '15']);
    });

    test('calculates vertical coordinates correctly', () => {
      const ship = new Ship(4, 1, 2, false);
      expect(ship.calculateCoordinates()).toEqual(['12', '22', '32', '42']);
    });
  });

  describe('cloning', () => {
    test('creates deep copy of ship', () => {
      const original = new Ship(3, 0, 0, true);
      original.hit('00');
      original.hit('01');
      
      const cloned = original.clone();
      
      // Test all properties are copied
      expect(cloned.id).toBe(original.id);
      expect(cloned.length).toBe(original.length);
      expect(cloned.row).toBe(original.row);
      expect(cloned.col).toBe(original.col);
      expect(cloned.isHorizontal).toBe(original.isHorizontal);
      expect(Array.from(cloned.hits)).toEqual(Array.from(original.hits));
      expect(cloned.locations).toEqual(original.locations);
      expect(cloned.createdAt.getTime()).toBe(original.createdAt.getTime());
      
      // Test independence
      original.hit('02');
      expect(cloned.isHit('02')).toBe(false);
      expect(original.isHit('02')).toBe(true);
    });
  });
}); 