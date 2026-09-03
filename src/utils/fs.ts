import fs from 'fs/promises';

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const writeFileAtomic = async (filePath: string, content: string): Promise<void> => {
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, content, 'utf-8');
  await fs.rename(temporaryPath, filePath);
};