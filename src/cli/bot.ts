import dotenv from 'dotenv';
import { BotService } from '../services/bot';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

const bot = new BotService(token);

bot.start().catch(console.error);

// Handle shutdown
process.on('SIGINT', () => {
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stop();
  process.exit(0);
});