import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('C:/Users/USER/.gemini/antigravity/brain/98fd8327-4b61-4b20-94e6-97ad4a9b1f6b/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.includes('FEATURE UPDATE: LIVE FOOD PREPARATION ANIMATION')) {
      const obj = JSON.parse(line);
      fs.writeFileSync('c:/Users/USER/Downloads/vivacity/prompt_full.txt', obj.content, 'utf8');
      console.log('Successfully wrote prompt_full.txt, length:', obj.content.length);
      return;
    }
  }
  console.log('Not found');
}
main();
