import fs from 'fs/promises';
import path from 'path';
import { fileExists } from '../utils';

export class EmojiProcessor {
  private emojiMap: Record<string, string> = {};

  async loadEmojiMap(): Promise<void> {
    const emojiMapPath = path.join(process.cwd(), 'src', 'formatter', 'config', 'emoji_map.json');
    if (await fileExists(emojiMapPath)) {
      const content = await fs.readFile(emojiMapPath, 'utf-8');
      this.emojiMap = JSON.parse(content);
    }
  }

  private findEmoji(text: string): string {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      // Special handling for "frutta" - show random fruit emoji
      if (word === 'frutta') {
        const fruitEmojis = ['🍇', '🍎', '🍊', '🍌', '🍑', '🍓','🥝', '🥭', '🍏', '🍉'];
        return fruitEmojis[Math.floor(Math.random() * fruitEmojis.length)];
      }
      // Special handling for "verdura" - show random vegetable emoji
      if (word === 'verdura') {
        const vegetableEmojis = ['🥦', '🥬', '🍅', '🥕', '🥒', '🫜', '🍆','🫛'];
        return vegetableEmojis[Math.floor(Math.random() * vegetableEmojis.length)];
      }
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
    
    // Check if school is closed
    if (content.includes('## Scuola chiusa')) {
      // Replace the date line and add school closed message
      const lines = content.split('\n');
      const processedLines: string[] = [];
      
      for (const line of lines) {
        if (line.startsWith('# Menu del')) {
          // Convert "# Menu del LUNEDI' 05 GENNAIO 2026" to "*05 gennaio*" (grassetto)
          const dateMatch = line.match(/(\d{2}).+?(\w+)/);
          if (dateMatch) {
            const [_, day, month] = dateMatch;
            processedLines.push(`*${day} ${month.toLowerCase()}*`);
          } else {
            processedLines.push(line);
          }
        } else if (line.includes('Scuola chiusa')) {
          processedLines.push('🏫 scuola chiusa');
        }
        // Skip other lines when school is closed
      }
      
      await fs.writeFile(filePath, processedLines.join('\n'), 'utf-8');
      return;
    }

    // Normal processing for regular menus
    const lines = content.split('\n');
    const processedLines: string[] = [];
    
    let lastLineWasContent = false;
    let inMenuSection = false;
    
    for (const line of lines) {
      if (line.startsWith('# Menu del')) {
        inMenuSection = true;
        // Convert "# Menu del MERCOLEDI' 05 NOVEMBRE 2025" to "*05 novembre*" (grassetto)
        const dateMatch = line.match(/(\d{2}).+?(\w+)/);
        if (dateMatch) {
          const [_, day, month] = dateMatch;
          processedLines.push(`*${day} ${month.toLowerCase()}*`);
        } else {
          processedLines.push(line);
        }
      } else if (line.startsWith('## ')) {
        // Add blank line before second header
        if (lastLineWasContent) {
          processedLines.push('');
        }
        // Extract just "infanzia" or "primaria" and format in corsivo (senza ##)
        const type = line.toLowerCase().includes('primaria') ? 'primaria' : 'infanzia';
        processedLines.push(`_${type}_`);
        lastLineWasContent = false;
      } else if (line.startsWith('### ')) {
        // Skip course headers
        continue;
      } else if (inMenuSection && line.startsWith('-')) {
        // Process menu item
        const dish = line.replace(/^-\s*/, '').trim().toLowerCase();
        const emoji = this.findEmoji(dish);
        processedLines.push(`${emoji} ${dish}`);
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