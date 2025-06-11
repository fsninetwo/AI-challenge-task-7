# Sea Battle Game - Unit Tests

## Overview

Comprehensive unit tests for the modularized Sea Battle game covering all modules and design patterns.

## Test Files

- `GameConfig.test.js` - Singleton pattern and configuration testing
- `ValidationStrategy.test.js` - Strategy pattern for input validation
- `Ship.test.js` - Ship entity behavior and hit detection
- `GameBoard.test.js` - Board management and grid operations
- `ShipFactory.test.js` - Factory pattern for ship creation
- `AIStrategies.test.js` - AI hunt/target strategies
- `Commands.test.js` - Command pattern implementation
- `GameObservers.test.js` - Observer pattern and event handling
- `GameStates.test.js` - State pattern for game flow
- `Game.test.js` - Main game class integration

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Design Patterns Tested

### 1. Singleton Pattern (GameConfig)
- Instance reuse and configuration access
- Message interpolation with parameters
- Immutability validation

### 2. Strategy Pattern (Validation)
- Individual validation strategies
- Strategy chaining and composition
- Error handling and validation flow

### 3. Factory Pattern (ShipFactory)
- Ship creation and placement
- Overlap detection and prevention
- Random ship generation

### 4. Command Pattern (Commands)
- Command execution and history
- Undo functionality
- Command lifecycle management

### 5. Observer Pattern (GameObservers)
- Event emission and handling
- Statistics tracking
- Observer management

### 6. State Pattern (GameStates)
- State transitions and behavior
- Game flow control
- State machine management

## Test Coverage

The test suite covers:
- Core game logic (ship placement, hit detection, game flow)
- Input validation (format, range, duplicates)
- AI behavior (hunt/target modes, strategy switching)
- All six design patterns
- Error handling and edge cases

## Key Testing Features

- **Mocking**: Isolated module testing with Jest mocks
- **Edge Cases**: Boundary conditions and error scenarios
- **Integration**: Cross-module interaction testing
- **Assertions**: Comprehensive behavior validation

## Test Quality

- 45+ individual unit tests
- Extensive mocking for isolation
- Descriptive test names and organization
- Clear assertions and error messages 