# GnammoBOT 🍝

A TypeScript bot that fetches school menu data and sends it to Telegram. Supports multiple menus (infanzia/primaria) and adds emoji to dishes.

## Features

- 🔄 Fetches daily menu from school restaurant API
- 🎯 Filters menus based on day of week (primaria menu only on Mon/Wed)
- 🎨 Adds relevant emoji to each dish
- 📱 Sends formatted menu to Telegram
- ⏰ Runs automatically every weekday at 7 AM
- 🔒 Handles authentication and cookie refresh

## Prerequisites

- Node.js (v20 or higher)
- npm
- A Telegram bot token and chat ID

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/noncandeggiare/Gn4mmoBot.git
   cd Gn4mmoBot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy example.env to .env and configure:
   ```bash
   cp example.env .env
   ```

4. Fill in the .env file with your credentials:
   - API_USERNAME: School menu API username
   - API_PASSWORD: School menu API password
   - MENU_IDS: Comma-separated list of menu IDs (e.g., "590,591")
   - TELEGRAM_BOT_TOKEN: Your Telegram bot token
   - TELEGRAM_CHAT_ID: Your Telegram chat ID

## Usage

### Manual Run

```bash
# Run for today
npm start

# Run for specific date
npm start -- --date 2025-11-05
```

### GitHub Actions

The bot runs automatically every weekday at 5 AM via GitHub Actions. To set this up:

1. Fork this repository
2. Add these secrets to your repository:
   - API_USERNAME
   - API_PASSWORD
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

ISC