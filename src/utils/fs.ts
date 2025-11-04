export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await import('fs/promises').then(fs => fs.access(filePath));
    return true;
  } catch {
    return false;
  }
};