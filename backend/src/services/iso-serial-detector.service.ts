import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ISOInfo {
  filepath: string;
  filename: string;
  serial: string | null;
  title: string | null;
}

export class ISOSerialDetector {

  async extractSerialFromISO(isoPath: string): Promise<string | null> {
    try {
      try {
        const { stdout } = await execAsync(`7z e -so "${isoPath}" SYSTEM.CNF 2>/dev/null`);
        const serial = this.parseSystemCNF(stdout);
        if (serial) return serial;
      } catch (err) {
      }

      try {
        const { stdout } = await execAsync(`isoinfo -i "${isoPath}" -x /SYSTEM.CNF 2>/dev/null`);
        const serial = this.parseSystemCNF(stdout);
        if (serial) return serial;
      } catch (err) {
      }

      return await this.searchSerialInBinary(isoPath);
    } catch (error) {
      console.error(`Error extracting serial from ${isoPath}:`, error);
      return null;
    }
  }

  private parseSystemCNF(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('BOOT') || line.includes('BOOT2')) {
        const match = line.match(/([A-Z]{4})[_\s]?(\d{3})\.?(\d{2})/i);
        if (match) {
          const serial = `${match[1]}-${match[2]}${match[3]}`;
          return serial;
        }
      }
    }
    return null;
  }

  private async searchSerialInBinary(isoPath: string): Promise<string | null> {
    try {
      const buffer = Buffer.alloc(1024 * 1024);
      const fd = fs.openSync(isoPath, 'r');
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);

      const content = buffer.toString('ascii');

      const patterns = [
        /([A-Z]{4})[_\s](\d{3})\.(\d{2})/g,
        /([A-Z]{4})-(\d{5})/g,             
      ];

      for (const pattern of patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[2]) {
            const serial = match[0].includes('-') 
              ? match[0] 
              : `${match[1]}-${match[2]}${match[3] || ''}`;
            return serial.replace('_', '-');
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async scanDirectory(directory: string): Promise<ISOInfo[]> {
    const results: ISOInfo[] = [];

    if (!fs.existsSync(directory)) {
      return results;
    }

    const files = fs.readdirSync(directory);

    for (const file of files) {
      const filepath = path.join(directory, file);
      const stat = fs.statSync(filepath);

      if (stat.isFile() && (file.endsWith('.iso') || file.endsWith('.ISO'))) {
        
        const serial = await this.extractSerialFromISO(filepath);
        const title = path.basename(file, path.extname(file));

        results.push({
          filepath,
          filename: file,
          serial,
          title
        });
      }
    }

    return results;
  }

  findBestMatch(gameName: string, isoInfos: ISOInfo[]): ISOInfo | null {
    const normalized = gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    let bestMatch: ISOInfo | null = null;
    let bestScore = 0;

    for (const iso of isoInfos) {
      const isoTitle = (iso.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let score = 0;
      const shorter = normalized.length < isoTitle.length ? normalized : isoTitle;
      const longer = normalized.length >= isoTitle.length ? normalized : isoTitle;
      
      for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) score++;
      }
      
      const similarity = score / Math.max(normalized.length, isoTitle.length);
      
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = iso;
      }
    }

    return bestScore > 0.5 ? bestMatch : null;
  }
}