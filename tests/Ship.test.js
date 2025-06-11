const Ship = require('../src/entities/Ship');

describe('Ship', () => {
  test('should create ship with locations', () => {
    const locations = ['00', '01', '02'];
    const ship = new Ship(locations);
    
    expect(ship.locations).toEqual(locations);
    expect(ship.hits.size).toBe(0);
    expect(ship.id).toBeDefined();
    expect(ship.createdAt).toBeInstanceOf(Date);
  });

  test('should hit ship at valid location', () => {
    const ship = new Ship(['00', '01', '02']);
    
    const result = ship.hit('01');
    expect(result).toBe(true);
    expect(ship.hits.has('01')).toBe(true);
    expect(ship.isHit('01')).toBe(true);
  });

  test('should not hit ship at invalid location', () => {
    const ship = new Ship(['00', '01', '02']);
    
    const result = ship.hit('99');
    expect(result).toBe(false);
    expect(ship.hits.has('99')).toBe(false);
    expect(ship.isHit('99')).toBe(false);
  });

  test('should detect when ship is sunk', () => {
    const ship = new Ship(['00', '01', '02']);
    
    expect(ship.isSunk()).toBe(false);
    
    ship.hit('00');
    expect(ship.isSunk()).toBe(false);
    
    ship.hit('01');
    expect(ship.isSunk()).toBe(false);
    
    ship.hit('02');
    expect(ship.isSunk()).toBe(true);
  });

  test('should not be sunk when partially hit', () => {
    const ship = new Ship(['00', '01', '02']);
    
    ship.hit('00');
    ship.hit('01');
    
    expect(ship.isSunk()).toBe(false);
  });

  test('should return comprehensive status', () => {
    const ship = new Ship(['00', '01', '02']);
    ship.hit('00');
    
    const status = ship.getStatus();
    
    expect(status.id).toBe(ship.id);
    expect(status.locations).toEqual(['00', '01', '02']);
    expect(status.hits).toEqual(['00']);
    expect(status.isSunk).toBe(false);
    expect(status.hitPercentage).toBeCloseTo(33.33, 1);
    expect(status.remainingHits).toBe(2);
    expect(status.createdAt).toBeInstanceOf(Date);
  });

  test('should return correct ship length', () => {
    const ship = new Ship(['00', '01', '02']);
    expect(ship.getLength()).toBe(3);
    
    const singleShip = new Ship(['55']);
    expect(singleShip.getLength()).toBe(1);
  });

  test('should return unhit locations', () => {
    const ship = new Ship(['00', '01', '02']);
    ship.hit('01');
    
    const unhit = ship.getUnhitLocations();
    expect(unhit).toEqual(['00', '02']);
    expect(unhit).not.toContain('01');
  });

  test('should handle empty ship', () => {
    const ship = new Ship([]);
    
    expect(ship.getLength()).toBe(0);
    expect(ship.isSunk()).toBe(true); // Empty ship is considered sunk
    expect(ship.getUnhitLocations()).toEqual([]);
  });

  test('should prevent hitting same location twice', () => {
    const ship = new Ship(['00', '01']);
    
    expect(ship.hit('00')).toBe(true);
    expect(ship.hit('00')).toBe(true); // Still returns true but doesn't double-count
    expect(ship.hits.size).toBe(1);
  });

  test('should generate unique IDs for different ships', () => {
    const ship1 = new Ship(['00']);
    const ship2 = new Ship(['11']);
    
    expect(ship1.id).not.toBe(ship2.id);
    expect(ship1.id).toBeTruthy();
    expect(ship2.id).toBeTruthy();
  });
}); 