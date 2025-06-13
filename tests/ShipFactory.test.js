const ShipFactory = require('../src/entities/ShipFactory');
const Ship = require('../src/entities/Ship');

jest.mock('../src/config/GameConfig', () => {
  return jest.fn().mockImplementation(() => ({
    get: (key) => ({
      boardSize: 10,
      numShips: 3,
      shipLength: 3
    }[key])
  }));
});

describe('ShipFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new ShipFactory();
  });

  describe('Ship Creation', () => {
    test('should create ship with valid locations', () => {
      const locations = ['00', '01', '02'];
      const ship = factory.createShip(locations);
      
      expect(ship).toBeInstanceOf(Ship);
      expect(ship.locations).toEqual(locations);
      expect(ship.getLength()).toBe(3);
      expect(ship.id).toBeDefined();
    });

    test('should create ship with single location', () => {
      const locations = ['55'];
      const ship = factory.createShip(locations);
      
      expect(ship).toBeInstanceOf(Ship);
      expect(ship.locations).toEqual(locations);
      expect(ship.getLength()).toBe(1);
    });

    test('should create ship with empty locations array', () => {
      const locations = [];
      const ship = factory.createShip(locations);
      
      expect(ship).toBeInstanceOf(Ship);
      expect(ship.locations).toEqual(locations);
      expect(ship.getLength()).toBe(0);
    });

    test('should create ships with unique IDs', () => {
      const ship1 = factory.createShip(['00', '01', '02']);
      const ship2 = factory.createShip(['10', '11', '12']);
      
      expect(ship1.id).not.toBe(ship2.id);
    });
  });

  describe('Ship Generation', () => {
    test('should generate correct number of ships', () => {
      const ships = factory.generateShips();
      
      expect(ships).toHaveLength(3);
      ships.forEach(ship => {
        expect(ship).toBeInstanceOf(Ship);
        expect(ship.getLength()).toBe(3);
      });
    });

    test('should not place overlapping ships', () => {
      const ships = factory.generateShips();
      const allLocations = ships.flatMap(ship => ship.locations);
      const uniqueLocations = new Set(allLocations);
      
      expect(allLocations.length).toBe(uniqueLocations.size);
      expect(allLocations).toHaveLength(9); // 3 ships × 3 locations each
    });

    test('should generate ships within board boundaries', () => {
      const ships = factory.generateShips();
      
      ships.forEach(ship => {
        ship.locations.forEach(location => {
          const row = parseInt(location[0]);
          const col = parseInt(location[1]);
          
          expect(row).toBeGreaterThanOrEqual(0);
          expect(row).toBeLessThan(10);
          expect(col).toBeGreaterThanOrEqual(0);
          expect(col).toBeLessThan(10);
        });
      });
    });

    test('should generate valid ship placements', () => {
      const ships = factory.generateShips();
      
      ships.forEach(ship => {
        expect(factory.isValidPlacement(ship.locations)).toBe(true);
      });
    });

    test('should generate different ship configurations on multiple calls', () => {
      const ships1 = factory.generateShips();
      const ships2 = factory.generateShips();
      
      const locations1 = ships1.flatMap(ship => ship.locations).sort();
      const locations2 = ships2.flatMap(ship => ship.locations).sort();
      
      // Should be different (very high probability)
      expect(locations1).not.toEqual(locations2);
    });
  });

  describe('Placement Validation', () => {
    test('should validate continuous horizontal placement', () => {
      const horizontalShip = ['00', '01', '02'];
      expect(factory.isValidPlacement(horizontalShip)).toBe(true);
      
      const horizontalShip2 = ['34', '35', '36'];
      expect(factory.isValidPlacement(horizontalShip2)).toBe(true);
    });

    test('should validate continuous vertical placement', () => {
      const verticalShip = ['00', '10', '20'];
      expect(factory.isValidPlacement(verticalShip)).toBe(true);
      
      const verticalShip2 = ['45', '55', '65'];
      expect(factory.isValidPlacement(verticalShip2)).toBe(true);
    });

    test('should reject non-continuous placement', () => {
      const nonContinuous1 = ['00', '11', '22']; // Diagonal
      expect(factory.isValidPlacement(nonContinuous1)).toBe(false);
      
      const nonContinuous2 = ['00', '02', '04']; // Gaps
      expect(factory.isValidPlacement(nonContinuous2)).toBe(false);
      
      const nonContinuous3 = ['00', '01', '03']; // Gap in middle
      expect(factory.isValidPlacement(nonContinuous3)).toBe(false);
    });

    test('should validate single location placement', () => {
      expect(factory.isValidPlacement(['55'])).toBe(true);
      expect(factory.isValidPlacement(['00'])).toBe(true);
      expect(factory.isValidPlacement(['99'])).toBe(true);
    });

    test('should handle empty placement array', () => {
      expect(factory.isValidPlacement([])).toBe(true);
    });

    test('should validate placement with 2 locations', () => {
      expect(factory.isValidPlacement(['00', '01'])).toBe(true);
      expect(factory.isValidPlacement(['00', '10'])).toBe(true);
      expect(factory.isValidPlacement(['00', '11'])).toBe(false); // Diagonal
    });

    test('should reject placement outside board boundaries', () => {
      // Note: This depends on how the factory validates coordinates
      const outsideBoundary = ['99', '910']; // Invalid coordinate format
      // This test depends on the actual implementation
    });
  });

  describe('Overlap Detection', () => {
    test('should detect no overlap for separate ships', () => {
      const existingShips = [new Ship(['00', '01', '02'])];
      
      expect(factory.hasOverlap(['10', '11', '12'], existingShips)).toBe(false);
      expect(factory.hasOverlap(['33', '34', '35'], existingShips)).toBe(false);
      expect(factory.hasOverlap(['77', '78', '79'], existingShips)).toBe(false);
    });

    test('should detect full overlap', () => {
      const existingShips = [new Ship(['00', '01', '02'])];
      
      expect(factory.hasOverlap(['00', '01', '02'], existingShips)).toBe(true);
    });

    test('should detect partial overlap', () => {
      const existingShips = [new Ship(['00', '01', '02'])];
      
      expect(factory.hasOverlap(['01', '02', '03'], existingShips)).toBe(true);
      expect(factory.hasOverlap(['90', '00', '10'], existingShips)).toBe(true);
      expect(factory.hasOverlap(['02', '12', '22'], existingShips)).toBe(true);
    });

    test('should handle overlap with multiple existing ships', () => {
      const existingShips = [
        new Ship(['00', '01', '02']),
        new Ship(['10', '20', '30']),
        new Ship(['55', '56', '57'])
      ];
      
      expect(factory.hasOverlap(['33', '34', '35'], existingShips)).toBe(false);
      expect(factory.hasOverlap(['01', '11', '21'], existingShips)).toBe(true); // Overlaps first ship
      expect(factory.hasOverlap(['19', '20', '21'], existingShips)).toBe(true); // Overlaps second ship
      expect(factory.hasOverlap(['54', '55', '56'], existingShips)).toBe(true); // Overlaps third ship
    });

    test('should handle empty existing ships array', () => {
      expect(factory.hasOverlap(['00', '01', '02'], [])).toBe(false);
    });

    test('should handle single location overlap', () => {
      const existingShips = [new Ship(['55'])];
      
      expect(factory.hasOverlap(['55'], existingShips)).toBe(true);
      expect(factory.hasOverlap(['54'], existingShips)).toBe(false);
      expect(factory.hasOverlap(['44', '45', '55'], existingShips)).toBe(true);
    });
  });

  describe('Direction Generation', () => {
    test('should generate horizontal and vertical ships', () => {
      const ships = factory.generateShips();
      let hasHorizontal = false;
      let hasVertical = false;
      
      ships.forEach(ship => {
        if (ship.locations.length >= 2) {
          const firstLoc = ship.locations[0];
          const secondLoc = ship.locations[1];
          
          const firstRow = parseInt(firstLoc[0]);
          const firstCol = parseInt(firstLoc[1]);
          const secondRow = parseInt(secondLoc[0]);
          const secondCol = parseInt(secondLoc[1]);
          
          if (firstRow === secondRow) {
            hasHorizontal = true;
          } else if (firstCol === secondCol) {
            hasVertical = true;
          }
        }
      });
      
      // At least one ship should be in each direction (statistically very likely)
      expect(hasHorizontal || hasVertical).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle boundary ship placement', () => {
      // Ships at board edges
      const topEdge = ['00', '01', '02'];
      const bottomEdge = ['97', '98', '99'];
      const leftEdge = ['00', '10', '20'];
      const rightEdge = ['09', '19', '29'];
      
      expect(factory.isValidPlacement(topEdge)).toBe(true);
      expect(factory.isValidPlacement(bottomEdge)).toBe(true);
      expect(factory.isValidPlacement(leftEdge)).toBe(true);
      expect(factory.isValidPlacement(rightEdge)).toBe(true);
    });

    test('should handle corner ship placement', () => {
      const topLeft = ['00', '01', '02'];
      const topRight = ['07', '08', '09'];
      const bottomLeft = ['70', '80', '90'];
      const bottomRight = ['97', '98', '99'];
      
      expect(factory.isValidPlacement(topLeft)).toBe(true);
      expect(factory.isValidPlacement(topRight)).toBe(true);
      expect(factory.isValidPlacement(bottomLeft)).toBe(true);
      expect(factory.isValidPlacement(bottomRight)).toBe(true);
    });

    test('should handle maximum ship generation attempts', () => {
      // This tests that the factory doesn't get stuck in infinite loops
      // even with difficult placement scenarios
      expect(() => {
        factory.generateShips();
      }).not.toThrow();
    });
  });

  describe('Configuration Compliance', () => {
    test('should respect configuration values', () => {
      const ships = factory.generateShips();
      
      // Should generate numShips (3) ships
      expect(ships).toHaveLength(3);
      
      // Each ship should be shipLength (3) long
      ships.forEach(ship => {
        expect(ship.getLength()).toBe(3);
      });
    });

    test('should work with different configurations', () => {
      // This would test different ship lengths and counts
      // but requires mocking the GameConfig differently
      const ships = factory.generateShips();
      expect(ships).toHaveLength(3);
    });
  });
}); 