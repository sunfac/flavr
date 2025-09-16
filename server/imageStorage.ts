import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { URL } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Security configuration
const SECURITY_CONFIG = {
  // Exact trusted hosts for image downloads (hardened to specific endpoints)
  ALLOWED_HOSTS: [
    'oaidalleapiprodscus.blob.core.windows.net',
    'dalle-3-images.openai.com',
    // Removed broad domains like 'amazonaws.com', 'googleusercontent.com' for security
    // Add specific endpoints only when needed
  ],
  // Maximum file size (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  // Request timeout (30 seconds)
  REQUEST_TIMEOUT: 30000,
  // Allowed image MIME types
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  // Private IP ranges to block - Enhanced with more comprehensive ranges
  PRIVATE_IPV4_RANGES: [
    { start: '0.0.0.0', end: '0.255.255.255' },       // "This network"
    { start: '10.0.0.0', end: '10.255.255.255' },     // Private Class A
    { start: '100.64.0.0', end: '100.127.255.255' },   // Carrier-grade NAT
    { start: '127.0.0.0', end: '127.255.255.255' },    // Loopback
    { start: '169.254.0.0', end: '169.254.255.255' },  // Link-local
    { start: '172.16.0.0', end: '172.31.255.255' },    // Private Class B
    { start: '192.0.0.0', end: '192.0.0.255' },        // IETF Protocol Assignments
    { start: '192.0.2.0', end: '192.0.2.255' },        // TEST-NET-1
    { start: '192.88.99.0', end: '192.88.99.255' },    // IPv6 to IPv4 relay
    { start: '192.168.0.0', end: '192.168.255.255' },  // Private Class C
    { start: '198.18.0.0', end: '198.19.255.255' },    // Network interconnect device benchmark
    { start: '198.51.100.0', end: '198.51.100.255' },  // TEST-NET-2
    { start: '203.0.113.0', end: '203.0.113.255' },    // TEST-NET-3
    { start: '224.0.0.0', end: '239.255.255.255' },    // Multicast
    { start: '240.0.0.0', end: '255.255.255.255' },    // Reserved
  ],
  // Private IPv6 ranges (simplified check for common private ranges)
  PRIVATE_IPV6_PREFIXES: [
    '::1',           // Loopback
    'fc00:',         // Unique local addresses
    'fd00:',         // Unique local addresses
    'fe80:',         // Link-local
    'ff00:',         // Multicast
    '::',            // Unspecified/default
  ]
};

export class ImageStorage {
  private static readonly IMAGES_DIR = path.join(process.cwd(), 'server', 'public', 'recipe-images');

  /**
   * Validates if an IP address is in private/link-local ranges
   * Prevents SSRF attacks by blocking internal network access
   */
  private static isPrivateOrLocalIP(ip: string): boolean {
    if (!ip) return true; // Block empty/invalid IPs
    
    const ipVersion = isIP(ip);
    if (ipVersion === 0) return true; // Invalid IP
    
    if (ipVersion === 4) {
      // IPv4 validation
      const ipParts = ip.split('.').map(Number);
      if (ipParts.length !== 4 || ipParts.some(part => part < 0 || part > 255)) {
        return true; // Invalid IPv4
      }
      
      const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      
      for (const range of SECURITY_CONFIG.PRIVATE_IPV4_RANGES) {
        const startParts = range.start.split('.').map(Number);
        const endParts = range.end.split('.').map(Number);
        const startNum = (startParts[0] << 24) | (startParts[1] << 16) | (startParts[2] << 8) | startParts[3];
        const endNum = (endParts[0] << 24) | (endParts[1] << 16) | (endParts[2] << 8) | endParts[3];
        
        if (ipNum >= startNum && ipNum <= endNum) {
          return true; // IP is in private range
        }
      }
      return false; // Public IPv4
    } else if (ipVersion === 6) {
      // IPv6 validation - check common private prefixes
      const ipLower = ip.toLowerCase();
      return SECURITY_CONFIG.PRIVATE_IPV6_PREFIXES.some(prefix => 
        ipLower.startsWith(prefix)
      );
    }
    
    return true; // Default to block unknown formats
  }

  /**
   * Resolves hostname to IP addresses and validates none are private/local
   * Prevents DNS rebinding and CNAME attacks
   */
  private static async validateHostnameResolution(hostname: string): Promise<{ valid: boolean; error?: string; ips?: string[] }> {
    try {
      console.log(`🔍 Resolving DNS for hostname: ${hostname}`);
      
      // Resolve both IPv4 and IPv6 addresses
      const [ipv4Results, ipv6Results] = await Promise.allSettled([
        lookup(hostname, { family: 4, all: true }).catch(() => []),
        lookup(hostname, { family: 6, all: true }).catch(() => [])
      ]);
      
      const ipv4Addresses = ipv4Results.status === 'fulfilled' ? ipv4Results.value : [];
      const ipv6Addresses = ipv6Results.status === 'fulfilled' ? ipv6Results.value : [];
      
      const allIPs = [...ipv4Addresses, ...ipv6Addresses].map(result => result.address);
      
      if (allIPs.length === 0) {
        return { valid: false, error: `Hostname ${hostname} could not be resolved to any IP addresses` };
      }
      
      console.log(`🔍 Resolved ${hostname} to IPs: ${allIPs.join(', ')}`);
      
      // Check if any resolved IP is private/local
      const privateIPs = allIPs.filter(ip => this.isPrivateOrLocalIP(ip));
      
      if (privateIPs.length > 0) {
        return {
          valid: false,
          error: `Hostname ${hostname} resolves to private/local IP addresses: ${privateIPs.join(', ')}`,
          ips: allIPs
        };
      }
      
      console.log(`✅ All resolved IPs for ${hostname} are public addresses`);
      return { valid: true, ips: allIPs };
      
    } catch (error) {
      console.error(`❌ DNS resolution failed for ${hostname}:`, error);
      return { valid: false, error: `DNS resolution failed: ${error}` };
    }
  }

  /**
   * Validates if a URL is safe for downloading images
   * Prevents SSRF attacks with comprehensive DNS and redirect validation
   */
  private static async validateImageUrl(imageUrl: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = new URL(imageUrl);
      
      // Only allow HTTPS protocol for security
      if (url.protocol !== 'https:') {
        return { valid: false, error: `Protocol ${url.protocol} not allowed. Only HTTPS allowed for security.` };
      }

      // Check if hostname is in exact allowlist (hardened)
      const hostname = url.hostname.toLowerCase();
      const isAllowedHost = SECURITY_CONFIG.ALLOWED_HOSTS.includes(hostname);
      
      if (!isAllowedHost) {
        return { valid: false, error: `Hostname ${hostname} not in allowlist. Only trusted image providers allowed: ${SECURITY_CONFIG.ALLOWED_HOSTS.join(', ')}` };
      }

      // If hostname is directly an IP address, validate it
      if (isIP(hostname)) {
        if (this.isPrivateOrLocalIP(hostname)) {
          return { valid: false, error: `Direct IP access to private/local address ${hostname} not allowed.` };
        }
        // Public IP in allowlist is OK (though unusual for our use case)
        return { valid: true };
      }

      // Block dangerous hostnames
      const blockedHostnames = [
        'localhost', '0.0.0.0', '127.0.0.1', '::1',
        'metadata.google.internal', 'metadata.goog', 'metadata',
        'instance-data', 'instance-data.ec2.internal'
      ];
      if (blockedHostnames.some(blocked => hostname.includes(blocked))) {
        return { valid: false, error: `Hostname ${hostname} contains blocked patterns.` };
      }

      // CRITICAL: Resolve DNS to validate IP addresses
      const dnsValidation = await this.validateHostnameResolution(hostname);
      if (!dnsValidation.valid) {
        return { valid: false, error: `DNS validation failed: ${dnsValidation.error}` };
      }

      console.log(`🔒 URL validation passed for: ${hostname}`);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Invalid URL format: ${error}` };
    }
  }

  /**
   * Securely fetch with redirect validation to prevent SSRF bypasses
   * Manually handles redirects and validates each Location header
   */
  private static async secureRedirectAwareFetch(initialUrl: string, options: RequestInit = {}): Promise<{ response?: Response; error?: string }> {
    const MAX_REDIRECTS = 5;
    let currentUrl = initialUrl;
    let redirectCount = 0;

    while (redirectCount < MAX_REDIRECTS) {
      try {
        console.log(`🔒 Secure fetch attempt ${redirectCount + 1}: ${currentUrl}`);
        
        // CRITICAL: Validate each URL in redirect chain
        const urlValidation = await this.validateImageUrl(currentUrl);
        if (!urlValidation.valid) {
          return { error: `Redirect URL validation failed: ${urlValidation.error}` };
        }
        
        const response = await fetch(currentUrl, {
          ...options,
          redirect: 'manual' // CRITICAL: Handle redirects manually for security
        });
        
        // Check if it's a redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            return { error: `Redirect response without Location header at ${currentUrl}` };
          }
          
          // Resolve relative URLs
          const redirectUrl = new URL(location, currentUrl).toString();
          console.log(`🔄 Following redirect from ${currentUrl} to ${redirectUrl}`);
          
          currentUrl = redirectUrl;
          redirectCount++;
          continue;
        }
        
        // Final validation of response.url to prevent response manipulation
        if (response.url && response.url !== currentUrl) {
          console.log(`⚠️ Response URL differs from request URL: ${response.url} vs ${currentUrl}`);
          const finalUrlValidation = await this.validateImageUrl(response.url);
          if (!finalUrlValidation.valid) {
            return { error: `Final response URL validation failed: ${finalUrlValidation.error}` };
          }
        }
        
        return { response };
        
      } catch (error) {
        return { error: `Network error during secure fetch: ${error}` };
      }
    }
    
    return { error: `Too many redirects (>${MAX_REDIRECTS}) - potential redirect loop or attack` };
  }

  /**
   * Validates image content before downloading with redirect protection
   * Prevents DoS by checking size and content type
   */
  private static async validateImageContent(imageUrl: string): Promise<{ valid: boolean; error?: string; contentType?: string; contentLength?: number }> {
    try {
      console.log(`🔍 Validating image content from: ${imageUrl}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.REQUEST_TIMEOUT);

      try {
        // Use HEAD request to check content without downloading (with redirect protection)
        const fetchResult = await this.secureRedirectAwareFetch(imageUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Flavr-ImageStorage/1.0'
          }
        });
        
        if (fetchResult.error || !fetchResult.response) {
          return { valid: false, error: `Secure fetch failed: ${fetchResult.error}` };
        }
        
        const response = fetchResult.response;
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() || '';
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

        // Validate content type
        if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.some(type => contentType.startsWith(type))) {
          return { valid: false, error: `Invalid content type: ${contentType}. Only images allowed.` };
        }

        // Validate file size
        if (contentLength > SECURITY_CONFIG.MAX_FILE_SIZE) {
          return { valid: false, error: `File too large: ${contentLength} bytes. Maximum ${SECURITY_CONFIG.MAX_FILE_SIZE} bytes allowed.` };
        }

        console.log(`✅ Image validation passed: ${contentType}, ${contentLength} bytes`);
        return { valid: true, contentType, contentLength };
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return { valid: false, error: 'Request timeout' };
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error validating image content:', error);
      return { valid: false, error: `Content validation failed: ${error}` };
    }
  }

  static async ensureImagesDirectory(): Promise<void> {
    try {
      await mkdir(this.IMAGES_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating images directory:', error);
    }
  }

  static async downloadAndStoreImage(imageUrl: string, recipeId: number): Promise<string | null> {
    try {
      console.log(`📥 Starting secure image download for recipe ${recipeId} from: ${imageUrl}`);
      
      // SECURITY CHECK 1: Validate URL for SSRF protection (now async with DNS validation)
      const urlValidation = await this.validateImageUrl(imageUrl);
      if (!urlValidation.valid) {
        console.error(`🚨 SECURITY: URL validation failed: ${urlValidation.error}`);
        return null;
      }
      console.log(`🔒 URL validation passed`);

      // SECURITY CHECK 2: Validate content for DoS protection
      const contentValidation = await this.validateImageContent(imageUrl);
      if (!contentValidation.valid) {
        console.error(`🚨 SECURITY: Content validation failed: ${contentValidation.error}`);
        return null;
      }
      console.log(`🔒 Content validation passed: ${contentValidation.contentType}, ${contentValidation.contentLength} bytes`);

      await this.ensureImagesDirectory();
      console.log(`📁 Images directory ensured: ${this.IMAGES_DIR}`);

      // Determine file extension from content type or URL
      const extension = this.getExtensionFromContentType(contentValidation.contentType!) || 
                       this.getImageExtension(imageUrl) || 'png';
      const filename = `recipe-${recipeId}.${extension}`;
      
      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      const filepath = path.join(this.IMAGES_DIR, sanitizedFilename);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.REQUEST_TIMEOUT);

      try {
        // Download with streaming to prevent memory exhaustion (with redirect protection)
        console.log(`📡 Starting secure streaming download...`);
        const fetchResult = await this.secureRedirectAwareFetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Flavr-ImageStorage/1.0'
          }
        });
        
        if (fetchResult.error || !fetchResult.response) {
          console.error(`Failed to fetch image securely: ${fetchResult.error}`);
          return null;
        }
        
        const response = fetchResult.response;
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`Failed to download image: ${response.status} ${response.statusText}`);
          return null;
        }

        if (!response.body) {
          console.error('No response body received');
          return null;
        }

        // Stream the download with size limits
        const writeStream = createWriteStream(filepath);
        let bytesWritten = 0;

        // Create a transform stream to enforce size limits
        const sizeCheckStream = new (require('stream').Transform)({
          transform(chunk: Buffer, encoding: any, callback: Function) {
            bytesWritten += chunk.length;
            if (bytesWritten > SECURITY_CONFIG.MAX_FILE_SIZE) {
              callback(new Error(`File size exceeded maximum allowed: ${SECURITY_CONFIG.MAX_FILE_SIZE} bytes`));
              return;
            }
            callback(null, chunk);
          }
        });

        // Convert Web ReadableStream to Node.js stream for pipeline compatibility
        const nodeReadableStream = Readable.fromWeb(response.body as any);
        
        // Pipeline the streams
        await pipeline(
          nodeReadableStream,
          sizeCheckStream,
          writeStream
        );

        console.log(`✅ Image securely downloaded and written to: ${filepath} (${bytesWritten} bytes)`);
        
        // Return the public URL path
        return `/recipe-images/${sanitizedFilename}`;
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('🚨 SECURITY: Request timeout during download');
        } else {
          console.error('Error during streaming download:', fetchError);
        }
        
        // Clean up partial file
        try {
          await fs.promises.unlink(filepath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup partial file:', cleanupError);
        }
        
        return null;
      }
    } catch (error) {
      console.error('🚨 SECURITY: Error in secure image download:', error);
      return null;
    }
  }

  private static getImageExtension(url: string): string | null {
    const match = url.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Get file extension from MIME type
   */
  private static getExtensionFromContentType(contentType: string): string | null {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    
    // Extract base MIME type (remove any parameters)
    const baseMimeType = contentType.split(';')[0].toLowerCase();
    return mimeToExt[baseMimeType] || null;
  }

  /**
   * Checks if an image URL needs migration (is external)
   */
  static isExternalImageUrl(imageUrl: string | null | undefined): boolean {
    if (!imageUrl) return false;
    
    // Already local image
    if (imageUrl.startsWith('/recipe-images/')) return false;
    
    // External URLs that need migration
    return (
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://') ||
      imageUrl.includes('blob.core.windows.net') ||
      imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') ||
      imageUrl.includes('dalle-3-images') ||
      imageUrl.includes('openai.com')
    );
  }

  /**
   * Automatically migrates recipe image if it's external
   * Returns updated image URL (local path) or original URL if migration failed
   */
  static async autoMigrateRecipeImage(
    imageUrl: string | null | undefined,
    recipeId: number,
    storage: any
  ): Promise<string | null> {
    try {
      // Check if migration is needed
      if (!this.isExternalImageUrl(imageUrl)) {
        console.log(`🔄 Image already local or not provided, skipping migration for recipe ${recipeId}`);
        return imageUrl || null;
      }

      console.log(`📥 Starting secure automatic image migration for recipe ${recipeId} from: ${imageUrl}`);
      
      // SECURITY: Pre-validate URL before attempting download (now async)
      const urlValidation = await this.validateImageUrl(imageUrl!);
      if (!urlValidation.valid) {
        console.error(`🚨 SECURITY: Migration blocked for recipe ${recipeId} - ${urlValidation.error}`);
        console.log(`⚠️ Keeping original URL due to security validation failure`);
        return imageUrl || null;
      }
      
      // Download and store the image locally with security checks
      const localImagePath = await this.downloadAndStoreImage(imageUrl!, recipeId);
      
      if (localImagePath) {
        console.log(`✅ Image securely migrated for recipe ${recipeId}: ${localImagePath}`);
        
        // Update the recipe in the database with local image path
        await storage.updateRecipe(recipeId, { imageUrl: localImagePath });
        console.log(`✅ Recipe ${recipeId} updated with local image path in database`);
        
        return localImagePath;
      } else {
        console.log(`⚠️ Failed to securely migrate image for recipe ${recipeId}, keeping original URL`);
        return imageUrl || null;
      }
      
    } catch (error) {
      console.error(`❌ Error during secure automatic image migration for recipe ${recipeId}:`, error);
      return imageUrl || null;
    }
  }

  static async migrateExistingImages(): Promise<void> {
    console.log('Starting migration of existing DALL-E images...');
    
    try {
      const { storage } = await import('./storage');
      const recipes = await storage.getAllRecipes();
      
      let migrated = 0;
      let failed = 0;

      for (const recipe of recipes) {
        if (this.isExternalImageUrl(recipe.imageUrl)) {
          console.log(`Migrating image for recipe ${recipe.id}: ${recipe.title}`);
          
          const localImagePath = await this.downloadAndStoreImage(recipe.imageUrl!, recipe.id);
          
          if (localImagePath) {
            await storage.updateRecipeImage(recipe.id, localImagePath);
            migrated++;
            console.log(`✓ Migrated image for recipe ${recipe.id}`);
          } else {
            failed++;
            console.log(`✗ Failed to migrate image for recipe ${recipe.id}`);
          }
        }
      }

      console.log(`Migration complete: ${migrated} images migrated, ${failed} failed`);
    } catch (error) {
      console.error('Error during image migration:', error);
    }
  }
}