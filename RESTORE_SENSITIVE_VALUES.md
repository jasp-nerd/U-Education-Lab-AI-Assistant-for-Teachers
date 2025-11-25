# Restoring Sensitive Values

This extension requires sensitive configuration values that have been removed from the public repository for security reasons.

## Values to Restore

After cloning or pulling from GitHub, you need to restore the following sensitive values:

### 1. Chrome Extension Key (`manifest.json`)

**Location:** `chrome-extension/manifest.json` (line 6)

**Current placeholder:** `"key": "YOUR_CHROME_EXTENSION_KEY_HERE"`

**How to restore:**
- Check the `.sensitive-backup.json` file in this directory (if available locally)
- Or retrieve from your Chrome Web Store developer dashboard
- Replace `YOUR_CHROME_EXTENSION_KEY_HERE` with the actual key

### 2. OAuth Client ID (`background.js`)

**Location:** `chrome-extension/background.js` (line 5)

**Current placeholder:** `const OAUTH_CLIENT_ID = 'YOUR_OAUTH_CLIENT_ID_HERE';`

**How to restore:**
- Check the `.sensitive-backup.json` file in this directory (if available locally)
- Or retrieve from Google Cloud Console:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Select your project
  3. Navigate to "APIs & Services" > "Credentials"
  4. Find your OAuth 2.0 Client ID
  5. Copy the Client ID value
- Replace `YOUR_OAUTH_CLIENT_ID_HERE` with the actual Client ID

## Quick Restore Script

If you have the `.sensitive-backup.json` file, you can manually copy the values from there:

```json
{
  "manifest_key": "...",
  "oauth_client_id": "..."
}
```

## Notes

- The `.sensitive-backup.json` file is gitignored and will not be pushed to GitHub
- These values are required for the extension to function properly
- Never commit these values to version control

