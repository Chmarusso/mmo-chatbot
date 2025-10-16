# Game Agent - AI-Powered Web Scraping Tool

## Overview

An intelligent Node.js script that automatically scrapes game information from the web and adds it to your database with AI-enhanced metadata. **No API keys required!**

## Quick Start

```bash
# No setup needed - just run!
pnpm add-game "Game Title"

# Optional: Add for AI-enhanced descriptions
OPENROUTER_API_KEY=your_key_here
```

## How It Works

```
1. Google Search  → Find game websites
2. Reddit Search  → Get player insights
3. Web Scraping   → Extract content from 5+ sources
4. AI Analysis    → Create engaging description
5. Database Save  → Store game with metadata
```

## Features

✅ **Zero API Dependencies** - Works immediately, no keys needed
✅ **Multi-Source Data** - Scrapes 5+ websites per game
✅ **Community Insights** - Real player opinions from Reddit
✅ **AI Enhancement** - Optional but recommended ($0.0001/game)
✅ **Smart Filtering** - Finds official sites, Steam, platform stores
✅ **Screenshot Extraction** - Auto-detects Open Graph images
✅ **Category Suggestions** - AI-powered categorization
✅ **Update Support** - Won't duplicate existing games

## What It Scrapes

### Google Search Results
- Official game websites
- Steam store pages
- Console platform pages (PlayStation, Xbox, Nintendo)
- Gaming wikis and databases
- Review aggregators

**Filters out**: Social media, YouTube, irrelevant sites

### Reddit JSON API
- Recent game discussions
- Player reviews and opinions
- Community sentiment
- Gameplay insights

No auth needed - uses public JSON endpoint!

### Website Data Extraction
For each source:
- Meta descriptions
- Open Graph tags (og:description, og:image)
- Main page content (first 2000 chars)
- Screenshot URLs

## Why Web Scraping vs APIs?

### ✅ Advantages

| Feature | Web Scraping | RAWG API | IGDB API |
|---------|--------------|----------|----------|
| API Keys | ❌ None | ✅ Required | ✅ Required |
| Rate Limits | ❌ None | ⚠️ 20k/month | ⚠️ Complex |
| Cost | 💰 Free | 💰 Free* | 💰 Free* |
| Data Sources | ✅ Multiple | ⚠️ Single | ⚠️ Single |
| Community Data | ✅ Reddit | ❌ No | ❌ No |
| Setup Time | ✅ 0 minutes | ⚠️ 5-10 min | ⚠️ 15-20 min |
| Always Current | ✅ Yes | ✅ Yes | ✅ Yes |

*Free tiers have restrictions

### ⚠️ Trade-offs

- **Slower**: 5-10 seconds vs 1-2 seconds
- **Fragile**: May break if sites change structure
- **Blocking Risk**: Google might rate-limit aggressive use
- **Less Structured**: Data quality varies by source

## Technical Implementation

### Web Scraping Strategy

```typescript
// 1. Google Search
fetch(google.com/search?q=game+title)
  → Extract URLs via regex
  → Filter for gaming sites
  → Return top 10 results

// 2. Reddit Search
fetch(reddit.com/search.json?q=game)
  → Parse JSON response
  → Extract post titles + text
  → Return community insights

// 3. Website Scraping
for each URL:
  fetch(url)
    → Extract meta tags
    → Parse og:description & og:image
    → Extract body text
    → Store combined content
```

### AI Enhancement

```typescript
// Sends to Claude Haiku
{
  input: "5000 chars of scraped content + Reddit insights",
  task: "Create 480-char description + suggest category",
  categories: "mmorpg, action_rpg, survival, fps, etc."
}

// Returns
{
  description: "Engaging 480-char summary",
  categorySlug: "mmorpg" | "action_rpg" | null
}
```

### Safety Features

- ✅ 10-second timeout per request
- ✅ 1-second delay between scrapes
- ✅ Chrome user-agent to avoid blocks
- ✅ Graceful error handling
- ✅ Continues on individual failures

## Database Schema

```prisma
model Game {
  value       String   @id          // Auto slug: "world_of_warcraft"
  label       String                // "World of Warcraft"
  description String?               // AI-enhanced (max 480 chars)
  screenshot  String?               // og:image URL
  website     String?               // Official or Steam URL
  categoryId  String?               // FK to GameCategory
}
```

## Example Output

```
🎮 Adding game: "Lost Ark"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Gathering information from the web...

  🔍 Searching Google for: "Lost Ark"
  ✓ Found 10 potential sources

  🔍 Searching Reddit for player insights...
  ✓ Found Reddit discussions (12 posts)

  📄 Scraping 5 sources...
    1. https://www.playlostark.com...
    2. https://store.steampowered.com...
    3. https://www.metacritic.com...
    4. https://lostark.wiki.fextralife.com...
    5. https://en.wikipedia.org...

  ✓ Scraped 5 sources successfully

✓ Information gathered from 5 sources

🤖 Analyzing content with AI...
  ✓ AI analysis complete

📋 Game Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Title: Lost Ark
  Description: Action-packed MMORPG featuring stunning combat, dungeon raids, and an epic storyline...
  Category: mmorpg
  Screenshot: ✓
  Website: ✓

💾 Saving to database...

✓ Game "Lost Ark" added successfully!
   Slug: lost_ark

✨ Done!
```

## Usage Examples

```bash
# Popular MMOs
pnpm add-game "World of Warcraft"
pnpm add-game "Final Fantasy XIV"
pnpm add-game "Guild Wars 2"

# Action RPGs
pnpm add-game "Path of Exile"
pnpm add-game "Diablo IV"
pnpm add-game "Elden Ring"

# Survival Games
pnpm add-game "Valheim"
pnpm add-game "Rust"
pnpm add-game "ARK"
```

## Environment Variables

```bash
# Optional - for AI-enhanced descriptions
OPENROUTER_API_KEY=sk-or-xxx

# Optional - for AI referrer header
APP_URL=http://localhost:3000
```

That's it! No other configuration needed.

## Cost Analysis

```
Per 1000 games:
- Web scraping: $0
- AI analysis: ~$0.10 (with OpenRouter)
- Total: ~$0.10

Compare to:
- RAWG API: Free (with limits)
- IGDB API: Free (complex setup)
- Manual data entry: $$$$ (hours of work)
```

## Files Structure

```
scripts/
├── add-game-agent.ts          # Main script (507 lines)
│   ├── searchGoogle()         # Google search scraper
│   ├── searchReddit()         # Reddit JSON API
│   ├── scrapeWebsite()        # HTML parsing
│   ├── analyzeGameWithAI()    # AI enhancement
│   └── addGameToDatabase()    # Prisma integration
│
├── README-add-game.md         # Detailed documentation
└── GAME-AGENT-SUMMARY.md      # This file

package.json                   # "add-game" npm script
```

## Troubleshooting

### Google blocks searches
- Wait 1-2 minutes
- Use VPN if persistent
- Reduce frequency

### No screenshots found
- Website doesn't use og:image tags
- Add manually later via admin panel

### Reddit fails
- Not critical, script continues
- Usually temporary API issues

### AI analysis fails
- Falls back to raw description
- Check OPENROUTER_API_KEY
- Still functional without AI

## Best Practices

1. ✅ Use official game titles
2. ✅ Run one at a time (respectful scraping)
3. ✅ Verify data after adding
4. ✅ Manual cleanup if needed
5. ❌ Don't batch process hundreds at once

## Legal & Ethical

- ✅ Public data only
- ✅ Respectful rate limiting
- ✅ Proper user agents
- ⚠️ Use responsibly
- ⚠️ Check local laws on scraping

## Future Enhancements

Potential additions:
- [ ] Batch CSV import
- [ ] Interactive mode with prompts
- [ ] Screenshot download & hosting
- [ ] Metacritic score extraction
- [ ] Steam player count integration
- [ ] Multi-language support
- [ ] Dry-run preview mode
- [ ] Caching layer

## Why This Approach?

### Independence
No reliance on third-party APIs that might:
- Change terms of service
- Introduce pricing
- Shut down
- Rate limit aggressively

### Flexibility
Can scrape ANY website, not limited to:
- One game database
- Specific platforms
- API restrictions

### Cost Control
Zero external costs except optional AI (~$0.0001/game)

### Data Quality
Multiple sources + community insights = richer descriptions

## Summary

**Best for**: Independent projects, no API dependency, cost-conscious
**Not for**: High-volume processing, guaranteed structure, speed-critical

The perfect balance of **autonomy**, **cost**, and **quality**! 🎮
