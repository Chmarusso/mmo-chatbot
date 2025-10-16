# Game Agent Script

AI-powered web scraping script to automatically add games to the MMOPLAYA database with rich metadata.

## Features

- 🔍 **Google Search** - Finds relevant game websites automatically
- 🗣️ **Reddit Integration** - Gathers real player insights and discussions
- 🌐 **Web Scraping** - Extracts info from multiple sources
- 🤖 **AI Enhancement** - Creates engaging descriptions from scraped content
- 🎯 **Smart Categorization** - AI suggests appropriate game categories
- 📸 **Media Extraction** - Finds screenshots via Open Graph tags
- 💾 **Database Integration** - Adds or updates games seamlessly

## How It Works

```
Game Title
    ↓
Google Search → Find relevant URLs
    ↓
Reddit Search → Get player insights
    ↓
Web Scraping → Extract content from 5+ sources
    ↓
AI Analysis → Create engaging description + category
    ↓
Database → Save game with metadata
```

## Setup

### Required

No API keys required for basic functionality! The script works with:
- Google search (scraping)
- Reddit JSON API (no auth needed)
- Web scraping

### Optional (Recommended)

For AI-enhanced descriptions:

```bash
OPENROUTER_API_KEY=your_openrouter_key_here
```

Add this to your `.env` file for better quality descriptions and automatic category detection.

## Usage

```bash
pnpm add-game "Game Title"
```

### Examples

```bash
# Add popular MMORPGs
pnpm add-game "World of Warcraft"
pnpm add-game "Final Fantasy XIV"
pnpm add-game "Lost Ark"

# Add other genres
pnpm add-game "Valheim"
pnpm add-game "Path of Exile"
pnpm add-game "Elden Ring"
```

## What It Does

### Step 1: Google Search
Searches Google for `"[Game Title] game official website"` and extracts relevant URLs, filtering out:
- Social media (YouTube, Facebook, Twitter)
- Non-game related sites
- Prioritizes: Steam, official sites, PlayStation, Xbox, etc.

### Step 2: Reddit Search
Uses Reddit's JSON API to find:
- Recent discussions
- Player reviews
- Community sentiment
- Gameplay insights

### Step 3: Web Scraping
For each source URL (up to 5):
- Extracts meta descriptions
- Finds Open Graph tags (og:description, og:image)
- Parses main content
- Respectful delays between requests (1 second)

### Step 4: AI Analysis
Sends scraped content to AI (if configured) to:
- Create engaging 480-character description
- Extract key gameplay features
- Suggest appropriate category
- Maintain player-focused language

### Step 5: Database Save
- Creates game with auto-generated slug
- Updates existing games if found
- Links to appropriate category
- Stores screenshot and website URLs

## Output Example

```
🎮 Adding game: "World of Warcraft"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Gathering information from the web...

  🔍 Searching Google for: "World of Warcraft"
  ✓ Found 10 potential sources

  🔍 Searching Reddit for player insights...
  ✓ Found Reddit discussions (8 posts)

  📄 Scraping 5 sources...
    1. https://worldofwarcraft.blizzard.com...
    2. https://store.steampowered.com/app/...
    3. https://www.metacritic.com/game/...
    4. https://en.wikipedia.org/wiki/World_of_Warcraft...
    5. https://www.ign.com/games/world-of-warcraft...

  ✓ Scraped 5 sources successfully

✓ Information gathered from 5 sources

🤖 Analyzing content with AI...

  ✓ AI analysis complete

📋 Game Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Title: World of Warcraft
  Description: The legendary MMORPG that defined a generation. Join millions in Azeroth's epic battles...
  Category: mmorpg
  Screenshot: ✓
  Website: ✓

💾 Saving to database...

✓ Game "World of Warcraft" added successfully!
   Slug: world_of_warcraft

✨ Done!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Database Schema

```prisma
model Game {
  value       String   @id          // "world_of_warcraft"
  label       String                // "World of Warcraft"
  description String?               // AI-enhanced (max 480 chars)
  screenshot  String?               // og:image from website
  website     String?               // Official or Steam URL
  categoryId  String?               // FK to GameCategory
}
```

## Technical Details

### Web Scraping Strategy

1. **User-Agent Spoofing**: Uses Chrome user-agent to avoid blocks
2. **Timeout Protection**: 10-second timeout per request
3. **Error Handling**: Continues on individual failures
4. **Rate Limiting**: 1-second delay between requests
5. **HTML Parsing**: Regex-based extraction (no external dependencies)

### Data Sources Priority

1. Official game websites
2. Steam store pages
3. Console platform sites (PlayStation, Xbox)
4. Gaming wikis and databases
5. Review aggregators

### AI Prompt Strategy

The AI receives:
- Scraped content from all sources (~5000 chars)
- Reddit community insights
- Available category list
- Strict formatting requirements

And produces:
- Engaging description (exactly 480 chars)
- Appropriate category suggestion
- Player-focused language

## Advantages Over API Approach

### ✅ Pros
- **No API keys needed** (except optional AI)
- **No rate limits** from third parties
- **More data sources** (not limited to one API)
- **Community insights** from Reddit
- **Cost-effective** ($0 for scraping, ~$0.0001 for AI per game)
- **Always current** (scrapes live data)

### ⚠️ Considerations
- Slower than APIs (5-10 seconds per game)
- May break if websites change structure
- Google may occasionally block automated searches
- Requires respectful scraping practices

## Troubleshooting

### "Could not find any relevant sources"
- Check game title spelling
- Try more common/official name
- Game might be too obscure (try adding more context)

### "Google search failed: 429"
- Google rate limiting detected
- Wait 1-2 minutes and try again
- Use a VPN if persistent

### "Reddit search failed"
- Usually temporary, try again
- Not critical - script continues without it

### No screenshot found
- Game website doesn't use Open Graph tags
- You can manually add screenshot URL later

### AI analysis failed
- Script falls back to raw scraped description
- Still functional, just less polished
- Check OPENROUTER_API_KEY if set

## Best Practices

1. **Accurate Titles**: Use official game titles
2. **Rate Limiting**: Don't run many games in quick succession
3. **Verify Data**: Check added games for accuracy
4. **Manual Cleanup**: Edit descriptions if needed
5. **Respect Sites**: Don't abuse the scraping

## No API Keys Needed!

Unlike the previous version, this script works completely independently:
- ✅ No RAWG.io API key
- ✅ No IGDB authentication
- ✅ No Steam API key
- ✅ Just run and go!

Only optional: `OPENROUTER_API_KEY` for AI enhancements (~$0.0001 per game)

## Cost Comparison

| Approach | Cost per 1000 games | Rate Limits |
|----------|---------------------|-------------|
| RAWG API | FREE (if under 20k/mo) | 20k/month |
| This Script | ~$0.10 (AI only) | None |
| IGDB API | FREE | Complex auth |

## Future Enhancements

Consider adding:
- [ ] Steam API integration for player counts
- [ ] Metacritic score extraction
- [ ] Multiple language support
- [ ] Screenshot downloads to local storage
- [ ] Batch processing mode
- [ ] Dry-run preview mode

## Legal & Ethical

This script:
- ✅ Uses public APIs (Reddit JSON)
- ✅ Scrapes publicly available data
- ✅ Respects robots.txt where applicable
- ✅ Includes rate limiting
- ✅ Uses proper user agents
- ⚠️ Use responsibly and ethically

For production use, consider:
- Caching scraped data
- Implementing exponential backoff
- Rotating user agents/IPs if needed
- Checking robots.txt explicitly
