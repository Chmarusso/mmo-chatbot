# Batch Add Games Script

This script processes an array of game titles and adds them to the database one by one using the `add-game-agent.ts` script.

## Features

- ✅ Processes games sequentially to avoid rate limiting
- ✅ Automatic 5-second delay between games
- ✅ Optional skip for games that already exist in database
- ✅ Start from specific index (resume after failure)
- ✅ Limit number of games to process
- ✅ Detailed progress logging and summary report
- ✅ Automatic cleanup and error handling

## Usage

### Basic Usage (Process all games)

```bash
pnpm add-games:batch
```

This will process all 100+ games in the list, one by one.

### Skip Existing Games

```bash
pnpm add-games:batch -- --skip-existing
```

This will check if each game already exists in the database and skip it if it does.

### Start From Specific Game

```bash
pnpm add-games:batch -- --start-from 50
```

This will start processing from game #51 (index 50). Useful if the script failed partway through.

### Limit Number of Games

```bash
pnpm add-games:batch -- --limit 10
```

This will process only the first 10 games. Useful for testing.

### Combine Multiple Options

```bash
pnpm add-games:batch -- --skip-existing --start-from 20 --limit 30
```

This will:
- Start from game #21 (index 20)
- Process 30 games (games 21-50)
- Skip any that already exist in database

## How It Works

1. **Check if game exists** (if `--skip-existing` flag is used)
2. **Run add-game-agent.ts** for each game
3. **Download gameplay images** from Google Image Search
4. **Validate and upload** to Supabase with fallback logic
5. **Wait 5 seconds** before processing next game
6. **Log results** and generate summary report

## Output

The script provides detailed logging:

```
🚀 Batch Add Games Script
================================================================================
Total games to process: 100
================================================================================

[1/100] Game #1: World of Warcraft (Retail)
================================================================================
🎮 Processing: World of Warcraft (Retail)
================================================================================
...
✅ Successfully added: World of Warcraft (Retail)

⏳ Waiting 5 seconds before next game...
```

At the end, you'll get a summary:

```
================================================================================
📊 BATCH PROCESSING SUMMARY
================================================================================
Total games processed: 100
✅ Successful: 95
❌ Failed: 5
⏭️  Skipped: 0
================================================================================
```

## Error Handling

- If a game fails to add, the script will log the error and continue with the next game
- Failed games are listed in the summary report
- The script waits 10 seconds after an error before continuing (longer delay to avoid rate limiting issues)

## Tips

1. **Use `--skip-existing`** when re-running to avoid duplicates
2. **Use `--start-from`** to resume after a failure
3. **Test with `--limit 5`** first to make sure everything works
4. **Monitor the output** for any persistent errors (API issues, rate limiting, etc.)
5. **Be patient** - processing 100 games takes ~10-15 minutes due to delays

## Environment Variables

Make sure you have these environment variables set:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for better results)
OPENROUTER_API_KEY=your_openrouter_key  # For Perplexity Sonar & AI descriptions
SERPER_API_KEY=your_serper_key          # For Google Search (has default)
```

## Modifying the Game List

To add or modify games, edit the `GAMES_TO_ADD` array in `scripts/batch-add-games.ts`:

```typescript
const GAMES_TO_ADD = [
  "Your Game Title Here",
  "Another Game",
  // ... more games
];
```

## Troubleshooting

### Rate Limiting Issues
- Increase the delay between games (edit the `setTimeout` values in the script)
- Use `--limit` to process in smaller batches

### API Errors
- Check that all environment variables are set correctly
- Verify your API keys are valid and have remaining credits

### Games Not Found
- Some games may not have enough online information
- Check the error message to see if it's a search issue or scraping issue
- You may need to add these games manually
