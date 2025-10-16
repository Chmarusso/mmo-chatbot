# Game Agent - AI-Powered Game Database Tool

## Overview

An intelligent Node.js script that automatically fetches game information and adds it to your database with AI-enhanced metadata.

## Quick Start

```bash
# 1. Add RAWG API key to .env
RAWG_API_KEY=your_key_here

# 2. (Optional) Add OpenRouter key for AI enhancement
OPENROUTER_API_KEY=your_key_here

# 3. Run the script
pnpm add-game "Game Title"
```

## Features

✅ **Automatic Game Search** - Uses RAWG.io API (500k+ games)
✅ **AI-Enhanced Descriptions** - Engaging, player-focused content
✅ **Smart Category Mapping** - Auto-suggests appropriate category
✅ **Screenshot Fetching** - High-quality game images
✅ **Website URLs** - Official sites or RAWG pages
✅ **Update Existing Games** - Won't create duplicates

## How It Works

```
User Input → RAWG API → AI Analysis → Database
    ↓           ↓            ↓           ↓
 "WoW"    Game Data    Description   Saved!
                       + Category
```

### Step by Step

1. **Search**: Queries RAWG.io for game title
2. **Fetch**: Gets description, genres, screenshots, website, release date
3. **Analyze**: AI generates engaging description & suggests category
4. **Save**: Creates/updates game in database with slug

## API Suggestions

### 🏆 Recommended: RAWG.io
- **Why**: Best balance of coverage, quality, and ease
- **Free Tier**: 20,000 requests/month
- **Coverage**: 500,000+ games
- **Sign Up**: https://rawg.io/apidocs
- **Used in script**: ✅ Implemented

### 🎮 Alternative Options

#### IGDB (Twitch/Amazon)
- **Pros**: Very detailed metadata, official Twitch API
- **Cons**: Requires OAuth setup, more complex
- **Best for**: Production apps needing detailed data
- **Sign Up**: https://api.igdb.com/

#### SteamSpy API
- **Pros**: No API key needed, great Steam data
- **Cons**: Only Steam games
- **Best for**: Steam-specific features
- **Docs**: https://steamspy.com/api.php

#### GiantBomb API
- **Pros**: High-quality curated data
- **Cons**: Smaller catalog, rate limits
- **Best for**: Review aggregation
- **Sign Up**: https://www.giantbomb.com/api/

## Database Schema

```typescript
model Game {
  value       String   @id          // slug: "world_of_warcraft"
  label       String                // "World of Warcraft"
  description String?               // 480 char max
  screenshot  String?               // Image URL
  website     String?               // Official URL
  categoryId  String?               // FK to GameCategory
}
```

## Environment Variables

```bash
# Required
RAWG_API_KEY=your_rawg_api_key

# Optional (for AI features)
OPENROUTER_API_KEY=your_openrouter_key
APP_URL=http://localhost:3000
```

## Examples

```bash
# Add popular MMORPGs
pnpm add-game "World of Warcraft"
pnpm add-game "Final Fantasy XIV"
pnpm add-game "Lost Ark"

# Add other genres
pnpm add-game "Valheim"           # Survival
pnpm add-game "Path of Exile"     # Action RPG
pnpm add-game "Rust"              # Survival/PvP
```

## Error Handling

- ✅ API failures → Falls back to basic data
- ✅ No AI key → Uses genre-based category mapping
- ✅ Duplicate games → Updates existing entry
- ✅ No results → Clear error message
- ✅ Invalid categories → Skips category assignment

## Files Created

```
scripts/
├── add-game-agent.ts          # Main script (340 lines)
├── README-add-game.md         # Detailed documentation
└── GAME-AGENT-SUMMARY.md      # This file

package.json                   # Added "add-game" script
```

## Tech Stack

- **Runtime**: Node.js (tsx)
- **Database**: Prisma + PostgreSQL
- **APIs**:
  - RAWG.io (game data)
  - OpenRouter/Claude (AI analysis)
- **Language**: TypeScript

## Future Enhancements

Consider adding:
- [ ] Batch import from CSV
- [ ] Interactive mode with prompts
- [ ] Dry-run mode (preview before save)
- [ ] Custom description override
- [ ] Multi-language support
- [ ] Steam integration for player counts
- [ ] Automatic screenshot download/hosting

## Cost Estimate

- **RAWG API**: FREE (20k/month)
- **OpenRouter (Claude Haiku)**: ~$0.0001 per game
- **Total for 1000 games**: ~$0.10

Very cost-effective! 💰

## Support

For issues or questions:
1. Check `scripts/README-add-game.md` for detailed docs
2. Verify API keys in `.env`
3. Test with well-known game titles first
4. Check RAWG.io website to confirm game exists
