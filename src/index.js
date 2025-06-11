#!/usr/bin/env node

/**
 * Sea Battle Game - Main Entry Point
 * 
 * Modularized implementation using design patterns and separation of concerns.
 * 
 * @author Sea Battle Team
 * @version 2.0.0
 */

const Game = require('./game/Game');

/**
 * Application entry point
 */
function main() {
  try {
    console.log('='.repeat(50));
    console.log('      🚢 Sea Battle Game v2.0 🚢');
    console.log('   Modularized with Design Patterns');
    console.log('='.repeat(50));
    
    // Create and start the game
    const game = new Game();
    game.start();
    
  } catch (error) {
    console.error('Failed to start game:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nGame interrupted. Thanks for playing!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nGame terminated. Thanks for playing!');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main();
}

module.exports = { main }; 