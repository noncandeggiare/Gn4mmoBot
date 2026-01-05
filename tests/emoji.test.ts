import { EmojiProcessor } from '../src/formatter/emoji';
import fs from 'fs/promises';
import path from 'path';
import * as utils from '../src/utils';

jest.mock('fs/promises');
jest.mock('../src/utils');

describe('EmojiProcessor', () => {
  let processor: EmojiProcessor;

  beforeEach(() => {
    processor = new EmojiProcessor();
    jest.spyOn(utils, 'fileExists').mockResolvedValue(true);
    (fs.readFile as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('emoji_map.json')) {
        return Promise.resolve(JSON.stringify({
          'pasta': '🍝',
          'riso': '🍚',
          'pollo': '🍗',
          'frutta': '🍇', // Mocked for testing, but actual logic uses random fruits
          'verdura': '🥦' // Mocked for testing, but actual logic uses random vegetables
        }));
      }
      return Promise.resolve('# Menu del LUNEDI\' 04 NOVEMBRE 2025\n## Menu infanzia\n- pasta al pomodoro\n- riso bianco\n- pollo arrosto');
    });
    (fs.writeFile as jest.Mock).mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processFile', () => {
    it('should process menu file and add emojis', async () => {
      const testFile = 'test-menu.md';
      await processor.processFile(testFile);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];

      expect(content).toContain('*04 novembre*');
      expect(content).toContain('_infanzia_');
      expect(content).toContain('🍝 pasta al pomodoro');
      expect(content).toContain('🍚 riso bianco');
      expect(content).toContain('🍗 pollo arrosto');
    });

    it('should throw error when menu file not found', async () => {
      // Mock fileExists to return false for the menu file
      const fileExistsMock = jest.fn()
        .mockResolvedValueOnce(true)  // for emoji_map.json
        .mockResolvedValueOnce(false); // for menu file
      jest.spyOn(utils, 'fileExists').mockImplementation(fileExistsMock);

      await expect(processor.processFile('non-existent.md')).rejects.toThrow('Menu file not found');
    });

    it('should use default emoji for unknown dishes', async () => {
      (fs.readFile as jest.Mock).mockReset();
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('emoji_map.json')) {
          return Promise.resolve('{}');
        }
        return Promise.resolve('# Menu del LUNEDI\' 04 NOVEMBRE 2025\n## Menu infanzia\n- unknown dish');
      });

      await processor.processFile('test-menu.md');
      
      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain('🍴 unknown dish');
    });

    it('should use random fruit emoji for "frutta"', async () => {
      jest.clearAllMocks();
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('emoji_map.json')) {
          return Promise.resolve('{}'); // Empty map to test special logic
        }
        return Promise.resolve('# Menu del LUNEDI\' 04 NOVEMBRE 2025\n## Menu infanzia\n- frutta');
      });

      await processor.processFile('test-menu.md');
      
      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      
      // Should contain one of the fruit emojis, not the default 🍴
      const fruitEmojis = ['🍇', '🍎', '🍊', '🍌', '🍑', '🍓'];
      const hasFruitEmoji = fruitEmojis.some(emoji => content.includes(emoji + ' frutta'));
      expect(hasFruitEmoji).toBe(true);
      expect(content).not.toContain('🍴 frutta');
    });

    it('should use random vegetable emoji for "verdura"', async () => {
      jest.clearAllMocks();
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('emoji_map.json')) {
          return Promise.resolve('{}'); // Empty map to test special logic
        }
        return Promise.resolve('# Menu del LUNEDI\' 04 NOVEMBRE 2025\n## Menu infanzia\n- verdura');
      });

      await processor.processFile('test-menu.md');
      
      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      
      // Should contain one of the vegetable emojis, not the default 🍴
      const vegetableEmojis = ['🥦', '🥬', '🍅', '🥕', '🌽', '🫑', '🥔'];
      const hasVegetableEmoji = vegetableEmojis.some(emoji => content.includes(emoji + ' verdura'));
      expect(hasVegetableEmoji).toBe(true);
      expect(content).not.toContain('🍴 verdura');
    });

    it('should handle school closed message', async () => {
      jest.clearAllMocks();
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('emoji_map.json')) {
          return Promise.resolve('{}');
        }
        return Promise.resolve('# Menu del LUNEDI\' 05 GENNAIO 2026\n\n## Scuola chiusa\n\nNessun menu disponibile per questa data.');
      });

      await processor.processFile('test-menu.md');
      
      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      
      expect(content).toContain('*05 gennaio*');
      expect(content).toContain('🏫 scuola chiusa');
      expect(content).not.toContain('## Scuola chiusa');
      expect(content).not.toContain('Nessun menu disponibile');
    });
  });
});