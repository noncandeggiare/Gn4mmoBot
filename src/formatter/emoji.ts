import fs from 'fs/promises';
import path from 'path';
import { fileExists } from '../utils';

export class EmojiProcessor {
  private emojiMap: Record<string, string> = {};

  constructor() {}

  async loadEmojiMap(): Promise<void> {
    const emojiMapPath = path.join(__dirname, 'config/emoji_map.json');
    if (await fileExists(emojiMapPath)) {
      const content = await fs.readFile(emojiMapPath, 'utf-8');
      this.emojiMap = JSON.parse(content);
    }
  }

  private findEmoji(text: string): string {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.emojiMap[word]) {
        return this.emojiMap[word];
      }
    }
    return '🍴'; // Default emoji
  }

  async processFile(filePath: string): Promise<void> {
    await this.loadEmojiMap();

    if (!await fileExists(filePath)) {
      throw new Error('Menu file not found');
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const processedLines: string[] = [];
    
    let lastLineWasContent = false;
    let inMenuSection = false;
    
    for (const line of lines) {
      if (line.startsWith('# Menu del')) {
        inMenuSection = true;
        // Convert "# Menu del MERCOLEDI' 05 NOVEMBRE 2025" to "**05 novembre**"
        const dateMatch = line.match(/(\d{2}).+?(\w+)/);
        if (dateMatch) {
          const [_, day, month] = dateMatch;
          processedLines.push(`**${day} ${month.toLowerCase()}**`);
        } else {
          processedLines.push(line);
        }
      } else if (line.startsWith('## ')) {
        // Add blank line before second header
        if (lastLineWasContent) {
          processedLines.push('');
        }
        // Extract just "infanzia" or "primaria" from the header
        const type = line.toLowerCase().includes('infanzia') ? 'infanzia' : 'primaria';
        processedLines.push(`## ${type}`);
        lastLineWasContent = false;
      } else if (line.startsWith('### ')) {
        // Skip course headers
        continue;
      } else if (inMenuSection && line.startsWith('-')) {
        // Process menu item
        const dish = line.replace(/^-\s*/, '').trim().toLowerCase();
        const emoji = this.findEmoji(dish);
        processedLines.push(`- ${emoji} ${dish}`);
        lastLineWasContent = true;
      } else if (line.trim() !== '') {
        // Keep non-empty lines that aren't course headers
        processedLines.push(line);
        lastLineWasContent = true;
      }
    }

    await fs.writeFile(filePath, processedLines.join('\n'), 'utf-8');
  }
}