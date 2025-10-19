# Test Fixtures

This directory contains test assets used by end-to-end tests.

## Files

- `test-avatar.png` - Minimal 1x1 blue PNG image used for testing avatar uploads
- `generate-test-avatar.ts` - Script to regenerate the test avatar image

## Regenerating Test Assets

To recreate the test avatar:

```bash
cd /Users/artur/Documents/code/mmo-playas
node -e "..."  # See generate-test-avatar.ts for the one-liner
```

Or use the TypeScript generator (once tsx path issues are resolved).
