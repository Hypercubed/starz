# Event and Command Analysis

## Event Inventory

### Core Game Events
Defined in `src/client/game/events.ts` and used by `GameManager`.

| Event Name | Type | Description |
| :--- | :--- | :--- |
| `GAME_INIT` | Lifecycle | Game initialization started. |
| `GAME_STARTED` | Lifecycle | Game loop started. |
| `GAME_STOPPED` | Lifecycle | Game loop stopped. |
| `GAME_TICK` | Lifecycle | A game tick occurred. |
| `STATE_UPDATED` | State | The game state definition or status changed. |
| `CONFIG_UPDATED` | State | Game configuration settings changed. |
| `PLAYER_UPDATED` | Player | Player properties changed. |
| `PLAYER_ELIMINATED` | Player | A player has been eliminated. |
| `PLAYER_WON` | Player | A player has won. |
| `PLAYER_LOST` | Player | A player has lost. |
| `PROCESS_ORDER` | Command | Request to execute an order. |
| `MOVE_COMPLETED` | Event | A move has been executed. |
| `LOG` | Utility | Debug/Info logging. |

### Local Manager Events
Defined in `src/client/managers/local.ts`.

| Event Name | Type | Description |
| :--- | :--- | :--- |
| `PLAYER_JOINED` | Player | A new player joined. |
| `PLAYER_REMOVED` | Player | A player left. |
| `ADD_MESSAGE` | UI Command | Display a message. |
| `CLEAR_MESSAGES` | UI Command | Clear all messages. |
| `TRACK` | Analytics | Analytics tracking generic event. |

### Playroom Service Events
Defined in `src/client/managers/services/playroom.ts` (RPC constants).

| Event Name | Type | Description |
| :--- | :--- | :--- |
| `GAME_STARTED` | Lifecycle | Remote signal that game started. |
| `PROCESS_ORDER` | Command | Remote signal that an order was issued. |
| `SYSTEM_UPDATED` | Sync | Remote signal to update a system state. |
| `PLAYER_ELIMINATED` | Player | Remote signal of elimination. |

### Server Shared Messages
Defined in `src/server/shared.ts`.

| Event Name | Type | Description |
| :--- | :--- | :--- |
| `LEADERBOARD_UPDATED` | State | The leaderboard has been updated. |

---

## Naming Guidance

### General Convention
- Use **UPPER_SNAKE_CASE** for all event constants.
- Group related events by the object they affect (e.g., `PLAYER_...`, `GAME_...`).

### Events (Notification)
Events describe something that *has happened*. Listeners react to them.
- **Mood**: Past Participle (e.g., `STARTED`, `UPDATED`, `DELETED`)
- **Format**: `[OBJECT]_[ACTION_PAST]`
- **Examples**: `PLAYER_ELIMINATED`, `CONFIG_UPDATED`

### Commands (Intent)
Commands describe an *intent* to do something. Handlers execute them.
- **Mood**: Imperative (e.g., `START`, `UPDATE`, `DELETE`)
- **Format**: `[VERB]_[OBJECT]`
- **Examples**: `ADD_MESSAGE`, `PROCESS_ORDER`
