# Sea Battle Game - Code Investigation Report

## Overview

This document provides a comprehensive analysis of the `seabattle.js` file, which implements a console-based Battleship/Sea Battle game in JavaScript. The game features a player vs CPU setup with an intelligent AI opponent.

## Game Configuration

The game is configured with the following parameters:

```javascript
var boardSize = 10;      // 10x10 game grid
var numShips = 3;        // 3 ships per player
var shipLength = 3;      // Each ship is 3 units long
```

### Key Data Structures

- `playerShips[]` / `cpuShips[]` - Arrays storing ship objects with locations and hit status
- `board[]` - Tracks player's attacks on CPU (opponent board)
- `playerBoard[]` - Shows player's ships and CPU attacks
- `guesses[]` / `cpuGuesses[]` - Track previous moves to prevent duplicates
- `cpuTargetQueue[]` - Queue for CPU's focused targeting after hits

## Core Game Components

### 1. Board Management

#### Board Creation
```javascript
function createBoard() {
  for (var i = 0; i < boardSize; i++) {
    board[i] = [];
    playerBoard[i] = [];
    for (var j = 0; j < boardSize; j++) {
      board[i][j] = '~';      // Water symbol
      playerBoard[i][j] = '~';
    }
  }
}
```

**Purpose**: Initializes two 10x10 grids filled with water symbols (`~`)

#### Board Display
```javascript
function printBoard() {
  console.log('\n   --- OPPONENT BOARD ---          --- YOUR BOARD ---');
  // Renders side-by-side board view
}
```

**Display Legend**:
- `~` - Water (unexplored)
- `S` - Player's ship
- `X` - Hit
- `O` - Miss

### 2. Ship Placement Algorithm

#### Random Ship Placement
```javascript
function placeShipsRandomly(targetBoard, shipsArray, numberOfShips) {
  var placedShips = 0;
  while (placedShips < numberOfShips) {
    var orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    // Collision detection and placement logic
  }
}
```

**Algorithm Steps**:
1. **Random Orientation**: 50% chance horizontal vs vertical
2. **Boundary Validation**: Ensures ship fits within board limits
3. **Collision Detection**: Prevents ship overlap
4. **Ship Object Creation**: 
   ```javascript
   var newShip = { 
     locations: [],  // Array of coordinate strings (e.g., "23", "45")
     hits: []       // Parallel array tracking hit status
   };
   ```

### 3. Player Input System

#### Input Processing
```javascript
function processPlayerGuess(guess) {
  // Validation checks:
  // 1. Exactly 2 digits required
  // 2. Coordinates within board bounds
  // 3. No duplicate guesses
  // 4. Hit detection against CPU ships
}
```

**Validation Flow**:
1. **Format Check**: Input must be exactly 2 digits (e.g., "05", "92")
2. **Range Validation**: Row/column must be 0-9
3. **Duplicate Prevention**: Check against previous guesses
4. **Hit Processing**: Compare against CPU ship locations

### 4. CPU Artificial Intelligence

The CPU implements a two-phase AI strategy that mimics intelligent human play:

#### Phase 1: Hunt Mode (Random Search)
```javascript
cpuMode = 'hunt';
guessRow = Math.floor(Math.random() * boardSize);
guessCol = Math.floor(Math.random() * boardSize);
```

**Behavior**: Random coordinate selection until a ship is hit

#### Phase 2: Target Mode (Focused Attack)
```javascript
if (hit && !isSunk(ship)) {
  cpuMode = 'target';
  var adjacent = [
    { r: guessRow - 1, c: guessCol },  // North
    { r: guessRow + 1, c: guessCol },  // South
    { r: guessRow, c: guessCol - 1 },  // West
    { r: guessRow, c: guessCol + 1 }   // East
  ];
  // Add valid adjacent cells to target queue
}
```

**Behavior**: After hitting a ship, systematically attacks adjacent cells

#### AI State Management
- **Mode Switching**: Transitions between hunt/target based on hit success
- **Target Queue**: Maintains priority list of cells to attack
- **Ship Tracking**: Returns to hunt mode after sinking a ship

### 5. Game State Management

#### Ship Status Tracking
```javascript
function isSunk(ship) {
  for (var i = 0; i < shipLength; i++) {
    if (ship.hits[i] !== 'hit') {
      return false;
    }
  }
  return true;
}
```

**Logic**: Ship is sunk when all positions are marked as hit

#### Win Condition Detection
```javascript
function gameLoop() {
  if (cpuNumShips === 0) {
    console.log('*** CONGRATULATIONS! You sunk all enemy battleships! ***');
    return;
  }
  if (playerNumShips === 0) {
    console.log('*** GAME OVER! The CPU sunk all your battleships! ***');
    return;
  }
  // Continue game...
}
```

## Game Flow Architecture

### Turn Sequence
1. **Display Current State**: Show both boards
2. **Player Input**: Get and validate player guess
3. **Process Player Turn**: Check hits, update board, decrement ships if sunk
4. **Check Win Conditions**: End game if all ships destroyed
5. **CPU Turn**: Execute AI strategy
6. **Update Game State**: Process CPU results
7. **Loop**: Return to step 1

### Data Flow Diagram
```
Player Input → Validation → Hit Detection → Board Update → Win Check
                                ↓
CPU AI Logic → Target Selection → Hit Processing → State Update → Win Check
```

## Technical Implementation Details

### Coordinate System
- **Format**: String concatenation of row+column (e.g., "23" = row 2, col 3)
- **Indexing**: Zero-based (0-9 for both dimensions)
- **Storage**: Coordinates stored as strings in ship location arrays

### Memory Management
- **Ship Objects**: Contain location and hit arrays of equal length
- **Board State**: Two separate 2D arrays for player and opponent views
- **Guess Tracking**: Linear arrays prevent duplicate moves

### Error Handling
- **Input Validation**: Multiple validation layers for user input
- **Boundary Checking**: Prevents array access violations
- **Collision Detection**: Ensures valid ship placement

## AI Strategy Analysis

### Effectiveness Factors
1. **Hunt Efficiency**: Random search covers board systematically over time
2. **Target Precision**: Focused attacks after hits maximize damage
3. **State Persistence**: Target queue maintains focus until ship is sunk
4. **Adaptive Behavior**: Switches strategies based on game state

### Potential Improvements
- **Pattern Recognition**: Could implement checkerboard hunting pattern
- **Probability Mapping**: Track most likely ship locations
- **Ship Size Awareness**: Consider remaining ship sizes when targeting

## Code Quality Assessment

### Strengths
- ✅ Clear separation of concerns (display, logic, AI)
- ✅ Comprehensive input validation
- ✅ Intelligent AI opponent
- ✅ Proper game state management
- ✅ User-friendly console interface

### Areas for Enhancement
- 🔄 Could benefit from modern JavaScript features (ES6+)
- 🔄 Error handling could be more robust
- 🔄 Code structure could use modularization
- 🔄 Magic numbers could be better abstracted

## Conclusion

The `seabattle.js` implementation demonstrates a well-structured approach to creating a console-based Battleship game. The combination of random ship placement, intelligent AI behavior, and comprehensive game state management creates an engaging player experience. The CPU's two-phase AI strategy effectively mimics human playing patterns, making it a challenging opponent while remaining fair and predictable in its logic. 