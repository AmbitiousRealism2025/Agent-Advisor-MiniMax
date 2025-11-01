# Environment Setup Fix

Your `.env` file is currently empty. Here's how to fix it:

## Quick Fix

1. **Open your `.env` file** in the project root:
   ```bash
   nano .env
   # or
   code .env
   ```

2. **Add your MiniMax JWT token**:
   ```bash
   # MiniMax API Configuration
   MINIMAX_JWT_TOKEN=your_actual_jwt_token_here

   # Optional: Logging and environment
   LOG_LEVEL=info
   NODE_ENV=development

   # Optional: Claude CLI path (if you have it installed)
   # CLI_PATH=/path/to/claude-cli
   ```

3. **Save the file** and try running the CLI again:
   ```bash
   npm run cli
   ```

## What Should Be in .env

Your `.env` file should look like this (with your actual token):

```bash
MINIMAX_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
LOG_LEVEL=info
NODE_ENV=development
```

**Important:**
- Replace the `MINIMAX_JWT_TOKEN` value with your actual token
- The token should be in JWT format (three parts separated by dots)
- Don't include quotes around the token

## Verify the Token Format

A valid JWT token has three parts separated by dots:
```
header.payload.signature
```

Example:
```
eyJhbGci...  .  eyJzdWIi...  .  SflKxwRJ...
```

If your token doesn't match this format, check with your MiniMax account.

## Alternative: Set Environment Variable Directly

If you want to test quickly without a `.env` file:

```bash
# On macOS/Linux
export MINIMAX_JWT_TOKEN="your_token_here"
npm run cli

# On Windows (PowerShell)
$env:MINIMAX_JWT_TOKEN="your_token_here"
npm run cli

# On Windows (CMD)
set MINIMAX_JWT_TOKEN=your_token_here
npm run cli
```

## Testing the Setup

After setting up your `.env` file, test it:

```bash
# Check if the variable is loaded
node -e "require('dotenv/config'); console.log('Token loaded:', !!process.env.MINIMAX_JWT_TOKEN)"

# Run the CLI
npm run cli
```

You should see "Token loaded: true" if everything is configured correctly.

## Common Issues

### Issue: "MINIMAX_JWT_TOKEN is required"
**Fix:** Make sure your `.env` file has the token and is saved

### Issue: "must be a valid JWT formatted token"
**Fix:** Check that your token has three parts separated by dots

### Issue: Still not loading
**Fix:** Try running with the token as a direct environment variable:
```bash
MINIMAX_JWT_TOKEN="your_token" npm run cli
```

## Quick Test Script

Create a file `test-env.js`:

```javascript
import 'dotenv/config';

console.log('Environment Variables Check:');
console.log('MINIMAX_JWT_TOKEN exists:', !!process.env.MINIMAX_JWT_TOKEN);
console.log('Token length:', process.env.MINIMAX_JWT_TOKEN?.length || 0);
console.log('Has three parts:', (process.env.MINIMAX_JWT_TOKEN?.split('.').length || 0) === 3);
console.log('LOG_LEVEL:', process.env.LOG_LEVEL || 'not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
```

Run it:
```bash
node test-env.js
```

This will show you exactly what's being loaded.
