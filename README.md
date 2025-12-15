# STARZ!

starz.io is a simple strategy game where you control a number of star systems and try to conquer The Bubble. The Bubble is a cluster of star systems connected by hyperspace lanes. You start with one system and must expand your control by sending ships to capture other systems.

## Lore

You are the commander of a fledgling interstellar empire.  Your species recently dicovered "The Bubble", a cluster of star systems connected by hyperspace lanes.  Your homeworld (✶) is the starting point of your expansion, and you must strategically capture other star systems to grow your influence and power.  Along the way, you will encounter habitable systems teeming with resources (✦) and rival empires vying for control of the same systems.  Outmaneuver and outthink them to become the dominant force in The Bubble!

## Gameplay

- The game is played in real-time, with each turn lasting 1 second.
- You begin the game controlling one system, your homeworld.
- Use middle mouse button to rotate/pan the view, scroll wheel to zoom.
- Each turn, your homeworld and any other inhabited systems you control, will produce an additional ship.
- You can send these ships to other systems to capture them.
- Each controlled system, whether inhabited or not, receives an additional ship every 25 turns.
- To transfer ships, left click on a system you control and then right click on a target system.
- This will send all available ships, less one, from the source system to the target system.
- Right click on the hyperspace lane between the systems to equalize ships between the systems, or attack the target system with half of the available ships.
- If the target system is uninhabited, you will capture it automatically.
- If the target system is inhabitable or controlled by another player, a battle will ensue.
- The player with the most ships on the target system after all ships have arrived will take control of the system.  Only the difference in ships remains.

## Mouse Controls

- Middle Mouse Button: Pan/Rotate View
- Scroll Wheel: Zoom In/Out
- Left Click on Owned System: Select Source System
- Ctrl + Left Click on Owned System: Add sytem to Selection
- Shift + Left Click on Owned System: Select Range of Systems
- Right Click on Target System: Send Ships to Target System
- Right Click on Hyperspace Lane: Equalize ships between systems or attack target system with half of available ships.

## Keyboard Controls

- Spacebar: Pause/Resume Game
- h: Center View on Homeworld
- c: Center View on the last selected system
- p: Change View Mode (e.g., toggle between normal and strategic view)
- ?: Show Help Menu

Cheats:

- alt-r: Reveal All Systems
- alt--: Decrease Game Speed
- alt-=: Increase Game Speed
- alt-c: Double Ships in all Owned Systems

## Development

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   Open http://localhost:5173 to view the game.

### Building

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory.

### Testing

- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- Linting: `npm run lint`

## Architecture Overview

- **Entry Point**: `src/main.ts` initializes the `GameManager`.
- **Game Logic**:
    - `src/game/`: Core game logic (pure functions, state manipulation).
    - `src/managers/`: Handles the game loop and orchestrates logic (e.g., `LocalGameManager`).
- **Rendering & UI**:
    - `src/ui/render.ts`: Handles D3.js rendering of the star map.
    - `src/ui/controls.ts`: Manages input (keyboard/mouse) and dispatches events.
- **State Management**:
    - The game uses a singleton `GameManager` pattern accessible via `globalThis.gameManager`.

## License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.