# Game Agent Script

AI-powered script to automatically add games to the MMOPLAYA database with rich metadata.

## Features

- 🔍 Searches RAWG.io API for game information
- 🤖 Uses AI to generate engaging descriptions
- 🎯 Automatically suggests appropriate game categories
- 📸 Fetches screenshots and URLs
- 💾 Adds or updates games in the database

## Setup

### 1. Get RAWG API Key (Required)

1. Visit https://rawg.io/apidocs
2. Sign up for a free account
3. Get your API key (20,000 requests/month free)
4. Add to your `.env` file:

```bash
RAWG_API_KEY=your_rawg_api_key_here
```

### 2. OpenRouter API Key (Optional)

For AI-enhanced descriptions and better category suggestions:

```bash
OPENROUTER_API_KEY=your_openrouter_key_here
```

If not provided, the script will use basic fallback logic.

## Usage

```bash
pnpm add-game "Game Title"
```

### Examples

```bash
# Add World of Warcraft
pnpm add-game "World of Warcraft"

# Add Final Fantasy XIV
pnpm add-game "Final Fantasy XIV"

# Add Lost Ark
pnpm add-game "Lost Ark"
```

## What It Does

1. **Searches RAWG.io**: Finds the game in the comprehensive RAWG database
2. **Fetches Data**: Gets title, description, genres, platforms, release date, screenshots, website
3. **AI Analysis** (if OpenRouter key provided):
   - Generates engaging, player-focused description (max 480 chars)
   - Suggests the most appropriate category from your database
4. **Database Update**:
   - Creates new game entry with auto-generated slug
   - Updates existing game if already in database
   - Links to appropriate category

## Database Schema

The script adds games to the `Game` table:

```prisma
model Game {
  value       String   @id          // Auto-generated slug
  label       String                // Game title
  description String?               // AI-enhanced or RAWG description
  screenshot  String?               // Background image URL
  website     String?               // Official website or RAWG page
  categoryId  String?               // Linked category
}
```

## API Recommendations

### Primary: RAWG.io
- **Best for**: General game database
- **Free tier**: 20,000 requests/month
- **Data quality**: Excellent
- **Coverage**: 500,000+ games
- **Sign up**: https://rawg.io/apidocs

### Alternative APIs

#### IGDB (Twitch)
- **Best for**: Detailed game metadata
- **Free tier**: Yes (requires Twitch account)
- **Data quality**: Excellent
- **Coverage**: Comprehensive
- **Sign up**: https://api.igdb.com/

#### SteamSpy API
- **Best for**: Steam-specific data
- **Free tier**: Unlimited (no key required)
- **Data quality**: Good for Steam games
- **Coverage**: Steam catalog only
- **Docs**: https://steamspy.com/api.php

#### GiantBomb API
- **Best for**: Game reviews and detailed info
- **Free tier**: Limited
- **Data quality**: Very high
- **Coverage**: Curated catalog
- **Sign up**: https://www.giantbomb.com/api/

## Troubleshooting

### "RAWG_API_KEY environment variable is required"
Add your RAWG API key to `.env` file.

### "No results found for [game]"
- Check the game title spelling
- Try a shorter or more common name
- Search RAWG.io website first to see the exact title

### "Game already exists"
The script will update the existing game with new data.

### AI analysis falls back to basic logic
- This happens when OPENROUTER_API_KEY is not set
- Or when AI request fails
- The script will still work, just with simpler category mapping

## Example Output

```
🔍 Searching for game: "World of Warcraft"

✓ Found: World of Warcraft
  Genres: MMORPG, RPG, Action
  Released: 2004-11-23
  Metacritic: 93

📊 Analyzing game with AI...

📝 Game data prepared:
  Title: World of Warcraft
  Description: The legendary MMORPG that defined a generation. Join millions in Azeroth's epic battles...
  Category: mmorpg
  Screenshot: Yes
  Website: https://worldofwarcraft.com

💾 Adding to database...

✓ Game "World of Warcraft" added successfully with slug: world_of_warcraft

✨ Done!
```

## Notes

- Games are identified by slugified title (lowercase, underscores)
- Descriptions are truncated to 480 characters (database limit)
- Screenshots use RAWG's background image
- If no official website, uses RAWG game page
- Category mapping uses AI or fallback genre mapping
