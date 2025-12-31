# BoxBattle Project Instructions

## Screenshot Protocol

**IMPORTANT:** Always take screenshots before and after every major design/UI update.

### When to Take Screenshots

Take screenshots for:
- Any CSS/styling changes (colors, shadows, spacing, etc.)
- Component visual updates
- Animation changes
- Layout modifications
- Any change that affects what the user sees

### Screenshot Process

1. **Before making changes:**
   - Start the dev server if not running: `npm run dev`
   - Use Puppeteer MCP to capture the current state
   - Save to `/screenshots/before-[feature-name]-[date].png`

2. **After making changes:**
   - Refresh the page to see changes
   - Capture the updated state
   - Save to `/screenshots/after-[feature-name]-[date].png`

### Screenshot Commands

Use the Puppeteer MCP tools:
- `puppeteer_navigate` - Go to URL (http://localhost:3000)
- `puppeteer_screenshot` - Capture the current page
- `puppeteer_click` - Click elements to test interactions

### Key Pages to Screenshot

| Page | URL | What to Capture |
|------|-----|-----------------|
| Landing | `http://localhost:3000` | Hero, features, CTA |
| Game Lobby | `http://localhost:3000/game` | Create/Join tabs |
| Game Board | (during active game) | Board, scores, turn indicator |
| Winner Overlay | (after game ends) | Victory/defeat screen |

### Screenshot Naming Convention

```
/screenshots/
  before-button-polish-2024-12-30.png
  after-button-polish-2024-12-30.png
  before-card-depth-2024-12-30.png
  after-card-depth-2024-12-30.png
```

---

## Development Notes

### Servers

- **Dev Server:** `npm run dev` (port 3000)
- **WebSocket Server:** `npm run ws-server` (port 8080) - Required for multiplayer

### Key Files

- Design tokens: `styles/design-tokens.css`
- Global styles: `app/globals.css`
- Game board: `components/game-board.tsx`
- Winner overlay: `components/winner-overlay.tsx`
- Multiplayer lobby: `components/multiplayer-lobby.tsx`

### Color System

- Player 1: `#3B82F6` (Blue)
- Player 2: `#EF4444` (Red)
- Background: `#0A0E27` (Deep Navy)
- Panel: `#1E2139` (Slate)

### Smart Contract

- Network: Mantle Sepolia Testnet (Chain ID: 5003)
- Contract: `0xf2943580DABc1dd5eD417a5DC58D35110640BB2f`
- Entry Fee: 0.01 MNT
