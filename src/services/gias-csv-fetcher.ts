import https from 'https';
import { URL } from 'url';
import zlib from 'zlib';
import { parse } from 'csv-parse/sync';

export interface GIASSchool {
  URN: string;
  EstablishmentName: string;
  'EstablishmentStatus (name)': string;
  'EstablishmentStatus (code)'?: string;
  'LA (name)': string;
  'LA (code)'?: string;
  'TypeOfEstablishment (name)': string;
  'TypeOfEstablishment (code)'?: string;
  'PhaseOfEducation (name)': string;
  'PhaseOfEducation (code)'?: string;
  StatutoryLowAge?: string;
  StatutoryHighAge?: string;
  Postcode?: string;
  Street?: string;
  Locality?: string;
  Town?: string;
  'County (name)'?: string;
  'GOR (name)'?: string; // Government Office Region
  SchoolWebsite?: string;
  TelephoneNum?: string;
  HeadFirstName?: string;
  HeadLastName?: string;
  HeadTitle?: string;
  NumberOfPupils?: string;
  [key: string]: string | undefined; // Allow additional fields
}

interface FetcherOptions {
  baseUrl?: string;
  debug?: boolean;
}

export class GIASCSVFetcher {
  private readonly baseUrl: string;
  private readonly debug: boolean;
  private cookies: Map<string, string> = new Map();
  private csrfToken = '';

  constructor(options: FetcherOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://get-information-schools.service.gov.uk';
    this.debug = options.debug || process.env.GIAS_DEBUG === 'true' || false;
  }

  /**
   * Main entry point - fetches all UK schools data
   */
  public async fetch(): Promise<GIASSchool[]> {
    try {
      this.log('Starting GIAS CSV fetch...');

      // Step 1: Initialize session
      await this.initializeSession();

      // Step 2: Request download
      const downloadId = await this.requestDownload();

      // Step 3: Wait for file generation
      await this.waitForGeneration(downloadId);

      // Step 4: Download and extract
      const csvData = await this.downloadAndExtract(downloadId);

      // Step 5: Parse CSV
      const schools = this.parseCSV(csvData);

      this.log(`Successfully fetched ${schools.length} schools`);
      return schools;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch GIAS data: ${message}`);
    }
  }

  /**
   * Initialize session and get CSRF token
   */
  private async initializeSession(): Promise<void> {
    this.log('Initializing session...');

    const response = await this.makeRequest(`${this.baseUrl}/Downloads`);

    if (response.status !== 200) {
      throw new Error(`Failed to initialize session: ${response.status}`);
    }

    // Extract CSRF token from HTML
    this.csrfToken = this.extractToken(response.body);

    if (!this.csrfToken) {
      // Try cookie fallback
      this.csrfToken = this.cookies.get('__RequestVerificationToken') || '';
      if (!this.csrfToken) {
        throw new Error('Could not find CSRF token');
      }
    }

    this.log(`Session initialized with token: ${this.csrfToken.substring(0, 20)}...`);
  }

  /**
   * Request CSV download
   */
  private async requestDownload(): Promise<string> {
    this.log('Requesting download...');

    const { day, month, year, dateStr } = this.getCurrentDateParams();

    const params = new URLSearchParams();
    params.append('__RequestVerificationToken', this.csrfToken);
    params.append('Skip', '');
    params.append('SearchType', 'Latest');
    params.append('FilterDate.Day', day.toString());
    params.append('FilterDate.Month', month.toString());
    params.append('FilterDate.Year', year.toString());
    params.append('Downloads[0].Tag', 'all.edubase.data');
    params.append('Downloads[0].FileGeneratedDate', dateStr);
    params.append('Downloads[0].Selected', 'true');

    const response = await this.makeRequest(
      `${this.baseUrl}/Downloads/Collate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.getCookieString(),
          'Referer': `${this.baseUrl}/Downloads`,
          'Origin': this.baseUrl
        },
        body: params.toString()
      },
      false // Don't follow redirects
    );

    // Extract download ID from redirect location
    const location = response.headers.location;
    if (location) {
      const uuidMatch = location.match(/([a-f0-9-]{36})/);
      if (uuidMatch) {
        const uuid = uuidMatch[0];
        this.log(`Download ID: ${uuid}`);
        return uuid;
      }
    }

    // Fallback: check response body
    const bodyMatch = response.body.match(/([a-f0-9-]{36})/);
    if (bodyMatch) {
      return bodyMatch[0];
    }

    throw new Error('Could not get download ID');
  }

  /**
   * Wait for file generation to complete
   */
  private async waitForGeneration(uuid: string): Promise<void> {
    this.log('Waiting for file generation...');

    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.makeRequest(
        `${this.baseUrl}/Downloads/Generated/${uuid}`,
        {
          headers: {
            'Cookie': this.getCookieString(),
            'Referer': `${this.baseUrl}/Downloads`
          }
        }
      );

      if (response.status === 200 &&
          (response.body.includes('Download/Extract') ||
           response.body.includes('download'))) {
        this.log('File generation complete');

        // Extract new token if present
        const newToken = this.extractToken(response.body);
        if (newToken) {
          this.csrfToken = newToken;
          this.log('Updated CSRF token');
        }

        // CRITICAL: Wait for file to be fully written to storage
        this.log('Waiting 5 seconds for file to be fully ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (i % 10 === 0 && i > 0) {
        this.log(`Still waiting... ${i}s`);
      }
    }

    throw new Error('Timeout waiting for file generation');
  }

  /**
   * Download and extract CSV from ZIP
   */
  private async downloadAndExtract(uuid: string): Promise<string> {
    this.log('Downloading file...');

    const params = new URLSearchParams({
      '__RequestVerificationToken': this.csrfToken,
      'id': uuid,
      'path': 'https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/File.xhtml',
      'returnSource': 'Downloads'
    });

    this.log(`Download params: ${params.toString()}`);

    const response = await this.makeRequest(
      `${this.baseUrl}/Downloads/Download/Extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.getCookieString(),
          'Referer': `${this.baseUrl}/Downloads/Generated/${uuid}`,
          'Origin': this.baseUrl
        },
        body: params.toString()
      },
      false // Don't follow redirects automatically
    );

    this.log(`Download response status: ${response.status}`);
    this.log(`Response URL: ${response.url}`);

    // Check if we got redirected to the actual file download
    if (response.url && response.url.includes('File.xhtml')) {
      // Try to download directly from the Azure API
      const fileUrl = `https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/File.xhtml?id=${uuid}`;
      this.log(`Downloading ZIP from: ${fileUrl}`);

      const zipResponse = await this.makeRequest(fileUrl, {
        headers: {
          'Accept': '*/*',
          'Referer': `${this.baseUrl}/Downloads/Generated/${uuid}`
        }
      });

      if (zipResponse.buffer && zipResponse.buffer.length > 0) {
        return this.extractCSV(zipResponse.buffer);
      } else {
        throw new Error('Empty response from file download');
      }
    } else if (response.status === 302 && response.headers.location) {
      // Follow redirect to ZIP file
      this.log('Following redirect to ZIP file...');
      this.log(`Redirect location: ${response.headers.location}`);

      const zipResponse = await this.makeRequest(response.headers.location, {
        headers: {
          'Cookie': this.getCookieString(),
          'Referer': `${this.baseUrl}/Downloads/Generated/${uuid}`
        }
      });

      if (zipResponse.buffer && zipResponse.buffer.length > 0) {
        return this.extractCSV(zipResponse.buffer);
      } else {
        throw new Error('Empty response from redirect');
      }
    } else if (response.status === 200) {
      // Maybe we got the file directly
      this.log(`Direct response, checking if it's a ZIP...`);
      if (response.buffer && response.buffer.length > 0) {
        // Check if it's actually a ZIP
        if (response.buffer[0] === 0x50 && response.buffer[1] === 0x4B) {
          return this.extractCSV(response.buffer);
        } else {
          // Maybe it's an HTML page, let's try the direct Azure URL
          const fileUrl = `https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/File.xhtml?id=${uuid}`;
          this.log(`Not a ZIP, trying direct download from: ${fileUrl}`);

          const zipResponse = await this.makeRequest(fileUrl, {
            headers: {
              'Accept': '*/*',
              'Referer': `${this.baseUrl}/Downloads/Generated/${uuid}`
            }
          });

          if (zipResponse.buffer && zipResponse.buffer.length > 0) {
            return this.extractCSV(zipResponse.buffer);
          } else {
            throw new Error('Empty response from direct download');
          }
        }
      }
    }

    throw new Error(`Unexpected response: ${response.status}`);
  }

  /**
   * Extract CSV from ZIP buffer
   */
  private extractCSV(zipBuffer: Buffer): string {
    this.log(`Extracting CSV from ZIP (${zipBuffer.length} bytes)...`);

    // Log first 100 bytes for debugging
    if (this.debug) {
      const preview = zipBuffer.slice(0, Math.min(100, zipBuffer.length));
      this.log(`Buffer preview: ${preview.toString('hex').substring(0, 200)}`);
      this.log(`Buffer as string: ${preview.toString('utf8').substring(0, 100).replace(/[^\x20-\x7E]/g, '.')}`);
    }

    // Check ZIP signature
    if (zipBuffer.length < 4) {
      throw new Error(`Buffer too small: ${zipBuffer.length} bytes`);
    }
    if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
      const sig = `${zipBuffer[0].toString(16)}${zipBuffer[1].toString(16)}`;
      throw new Error(`Invalid ZIP file signature: ${sig} (expected 504b)`);
    }

    // Read ZIP header
    const compressionMethod = zipBuffer.readUInt16LE(8);
    let compressedSize = zipBuffer.readUInt32LE(18);
    const filenameLength = zipBuffer.readUInt16LE(26);
    const extraFieldLength = zipBuffer.readUInt16LE(28);

    // Handle ZIP64 or missing sizes
    if (compressedSize === 0 || compressedSize === 0xFFFFFFFF) {
      compressedSize = zipBuffer.length - (30 + filenameLength + extraFieldLength) - 22;
    }

    // Extract filename
    const filenameStart = 30;
    const filename = zipBuffer.slice(filenameStart, filenameStart + filenameLength).toString('utf8');
    this.log(`Found file: ${filename}`);

    // Find data start
    const dataStart = 30 + filenameLength + extraFieldLength;

    let content: string;
    if (compressionMethod === 8) { // Deflate
      const compressedData = zipBuffer.slice(dataStart, dataStart + compressedSize);
      try {
        content = zlib.inflateRawSync(compressedData).toString('utf8');
      } catch {
        // Try alternative decompression
        try {
          content = zlib.inflateSync(compressedData).toString('utf8');
        } catch {
          // Search for valid deflate stream
          for (let offset = 0; offset < Math.min(100, compressedData.length); offset++) {
            try {
              content = zlib.inflateRawSync(compressedData.slice(offset)).toString('utf8');
              break;
            } catch {
              continue;
            }
          }
          if (!content!) {
            throw new Error('Could not decompress data');
          }
        }
      }
    } else if (compressionMethod === 0) { // No compression
      const uncompressedSize = zipBuffer.readUInt32LE(22);
      content = zipBuffer.slice(dataStart, dataStart + uncompressedSize).toString('utf8');
    } else {
      throw new Error(`Unsupported compression method: ${compressionMethod}`);
    }

    const lines = content.split('\n');
    this.log(`Extracted CSV with ${lines.length} lines`);

    return content;
  }

  /**
   * Parse CSV data into school objects
   */
  private parseCSV(csvData: string): GIASSchool[] {
    this.log('Parsing CSV data...');

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relaxed_quotes: true,
      relaxed_column_count: true,
      trim: true
    });

    return records as GIASSchool[];
  }

  /**
   * Make HTTPS request with redirect following
   */
  private async makeRequest(
    url: string,
    options: Record<string, unknown> = {},
    followRedirects = true,
    maxRedirects = 10
  ): Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
    buffer: Buffer;
    url: string;
  }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const reqOptions = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          ...options.headers
        }
      };

      const handleResponse = (res: typeof https.IncomingMessage.prototype) => {
        // Store cookies
        this.parseCookies(res.headers['set-cookie']);

        // Handle redirects
        if (followRedirects && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (maxRedirects <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }

          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `https://${parsedUrl.hostname}${res.headers.location}`;

          this.makeRequest(redirectUrl, {
            ...options,
            headers: {
              ...options.headers,
              'Cookie': this.getCookieString(),
              'Referer': url
            }
          }, true, maxRedirects - 1).then(resolve).catch(reject);
          return;
        }

        // Collect response data
        const chunks: Buffer[] = [];
        const encoding = res.headers['content-encoding'];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          let buffer = Buffer.concat(chunks);

          // Handle compression
          if (encoding === 'gzip') {
            buffer = zlib.gunzipSync(buffer);
          } else if (encoding === 'deflate') {
            buffer = zlib.inflateSync(buffer);
          } else if (encoding === 'br') {
            buffer = zlib.brotliDecompressSync(buffer);
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buffer.toString('utf8'),
            buffer: buffer,
            url: url
          });
        });
      };

      const req = https.request(reqOptions, handleResponse);

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Parse Set-Cookie headers
   */
  private parseCookies(setCookieHeaders: string[] | string | undefined): void {
    if (!setCookieHeaders) return;

    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
      }
    });
  }

  /**
   * Build cookie string
   */
  private getCookieString(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Extract CSRF token from HTML
   */
  private extractToken(html: string): string {
    const patterns = [
      /name="__RequestVerificationToken"[^>]*value="([^"]+)"/,
      /<input[^>]*name="__RequestVerificationToken"[^>]*value="([^"]+)"/,
      /__RequestVerificationToken['"]\s*:\s*['"]([^'"]+)['"]/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }

    return '';
  }

  /**
   * Get current date parameters
   */
  private getCurrentDateParams(): { day: number; month: number; year: number; dateStr: string } {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const dateStr = `${month}/${day}/${year} 12:00:00 AM`;
    return { day, month, year, dateStr };
  }

  /**
   * Log debug messages
   */
  private log(message: string): void {
    if (this.debug || process.env.GIAS_DEBUG) {
      console.log(`[GIASCSVFetcher] ${message}`);
    }
  }
}