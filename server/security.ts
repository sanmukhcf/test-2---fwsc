import dns from 'dns';
import { promisify } from 'util';

const lookupPromise = promisify(dns.lookup);

export interface ValidationCheckResult {
  isValid: boolean;
  cleanUrl: string;
  hostname: string;
  protocol: string;
  ip?: string;
  errorType?: 'INVALID_URL' | 'UNSUPPORTED_PROTOCOL' | 'PRIVATE_IP' | 'NXDOMAIN';
  errorMessage?: string;
}

// IP ranges that are private / internal / loopback / link-local / metadata
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  'instance-data'
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local & cloud metadata like 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private network 172.16.0.0 – 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

    return false;
  }

  // IPv6 checks
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
  }

  return false;
}

export async function validateTargetUrl(rawUrl: string): Promise<ValidationCheckResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      cleanUrl: '',
      hostname: '',
      protocol: '',
      errorType: 'INVALID_URL',
      errorMessage: 'Please enter a valid website URL.'
    };
  }

  let formatted = rawUrl.trim();
  // Automatically add https:// if missing scheme
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = 'https://' + formatted;
  }

  let parsed: URL;
  try {
    parsed = new URL(formatted);
  } catch {
    return {
      isValid: false,
      cleanUrl: formatted,
      hostname: '',
      protocol: '',
      errorType: 'INVALID_URL',
      errorMessage: 'Invalid URL format. Please enter a valid address (e.g. example.com).'
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return {
      isValid: false,
      cleanUrl: formatted,
      hostname: parsed.hostname,
      protocol,
      errorType: 'UNSUPPORTED_PROTOCOL',
      errorMessage: 'Only HTTP and HTTPS protocols are allowed for auditing.'
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return {
      isValid: false,
      cleanUrl: formatted,
      hostname,
      protocol,
      errorType: 'PRIVATE_IP',
      errorMessage: 'Localhost and private/internal hosts cannot be audited for security reasons.'
    };
  }

  // Check if hostname is direct IP
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        isValid: false,
        cleanUrl: formatted,
        hostname,
        protocol,
        errorType: 'PRIVATE_IP',
        errorMessage: 'Private and internal IP addresses cannot be audited.'
      };
    }
  }

  // DNS lookup to verify domain existence
  try {
    const lookup = await lookupPromise(hostname, { all: false });
    const ip = lookup.address;

    if (isPrivateOrReservedIp(ip)) {
      return {
        isValid: false,
        cleanUrl: formatted,
        hostname,
        protocol,
        ip,
        errorType: 'PRIVATE_IP',
        errorMessage: 'Domain resolves to a private or internal IP address.'
      };
    }

    return {
      isValid: true,
      cleanUrl: parsed.toString(),
      hostname,
      protocol,
      ip
    };
  } catch (err: any) {
    // ENOTFOUND / EAI_AGAIN / NXDOMAIN
    if (err.code === 'ENOTFOUND' || err.code === 'NXDOMAIN' || err.code === 'EAI_AGAIN') {
      return {
        isValid: false,
        cleanUrl: formatted,
        hostname,
        protocol,
        errorType: 'NXDOMAIN',
        errorMessage: 'Website Not Found'
      };
    }

    return {
      isValid: false,
      cleanUrl: formatted,
      hostname,
      protocol,
      errorType: 'NXDOMAIN',
      errorMessage: `DNS resolution failed: ${err.message || 'Website Not Found'}`
    };
  }
}
