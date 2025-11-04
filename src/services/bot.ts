import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs/promises';
import path from 'path';
import { fileExists } from '../utils';

const SUBSCRIBERS_FILE = path.join(__dirname, 'bot/data/subscribers.json');

interface Subscribers {
  subscribers: string[];
}

export class BotService {
  private bot: TelegramBot;
  private subscribers: string[] = [];

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
  }

  private async loadSubscribers(): Promise<void> {
    try {
      if (await fileExists(SUBSCRIBERS_FILE)) {
        const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
        const { subscribers } = JSON.parse(data) as Subscribers;
        this.subscribers = subscribers;
      }
    } catch (error) {
      console.error('Error loading subscribers:', error);
    }
  }

  private async saveSubscribers(): Promise<void> {
    try {
      await fs.writeFile(
        SUBSCRIBERS_FILE,
        JSON.stringify({ subscribers: this.subscribers }, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving subscribers:', error);
    }
  }

  private async addSubscriber(chatId: string): Promise<void> {
    if (!this.subscribers.includes(chatId)) {
      this.subscribers.push(chatId);
      await this.saveSubscribers();
    }
  }

  private setupHandlers(): void {
    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString();
      await this.addSubscriber(chatId);
      await this.bot.sendMessage(
        chatId,
        'Benvenutə ! 👋 Riceverai il menu della mensa ogni giorno alle 7 del mattino. Per smettere di ricevere il menu, usa il comando /stop.'
      );
    });

    // Handle /stop command
    this.bot.onText(/\/stop/, async (msg) => {
      const chatId = msg.chat.id.toString();
      this.subscribers = this.subscribers.filter(id => id !== chatId);
      await this.saveSubscribers();
      await this.bot.sendMessage(
        chatId,
        'Non riceverai più il menu. Se cambi idea, usa /start per ricominciare!'
      );
    });
  }

  public async sendToAll(message: string): Promise<void> {
    await this.loadSubscribers();
    
    const failedDeliveries: string[] = [];
    
    for (const chatId of this.subscribers) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Failed to send to ${chatId}:`, error);
        failedDeliveries.push(chatId);
      }
    }

    // Remove failed deliveries from subscribers
    if (failedDeliveries.length > 0) {
      this.subscribers = this.subscribers.filter(id => !failedDeliveries.includes(id));
      await this.saveSubscribers();
    }
  }

  public async start(): Promise<void> {
    await this.loadSubscribers();
    console.log('Bot started successfully');
  }

  public stop(): void {
    this.bot.stopPolling();
  }
}