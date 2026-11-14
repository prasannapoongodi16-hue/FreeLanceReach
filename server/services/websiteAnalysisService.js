import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const AUDIT_TIMEOUT_MS = 90_000;
const MAX_REDIRECTS = 5;
const CATEGORY_IDS = ['performance', 'accessibility', 'best-practices', 'seo'];
let auditRunning = false;

function isPublicIPv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function isPublicIPv6(address) {
  const value = address.toLowerCase().split('%')[0];
  if (!value.startsWith('2') && !value.startsWith('3')) return false;
  if (value.startsWith('2001:') || value.startsWith('2002:') || value.startsWith('3fff:')) return false;
  return true;
}

export function isPublicAddress(address) {
  const family = net.isIP(address);
  return family === 4 ? isPublicIPv4(address) : family === 6 && isPublicIPv6(address);
}

async function lookupWithTimeout(hostname, resolver) {
  let timer;
  try {
    return await Promise.race([
      resolver(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('DNS lookup timed out')), 5_000);
        timer.unref?.();
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function validatePublicUrl(input, resolver = dns.lookup) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter a valid website URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public HTTP and HTTPS websites can be analyzed');
  if (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) {
    throw new Error('Only standard public HTTP and HTTPS ports can be analyzed');
  }
  if (url.username || url.password) throw new Error('Website URLs cannot contain credentials');
  if (!url.hostname || url.hostname.endsWith('.') || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local')) {
    throw new Error('Local and private websites cannot be analyzed');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const literalFamily = net.isIP(hostname);
  if (literalFamily && !isPublicAddress(hostname)) throw new Error('Local and private websites cannot be analyzed');
  let addresses;
  try {
    addresses = literalFamily ? [{ address: hostname, family: literalFamily }] : await lookupWithTimeout(hostname, resolver);
  } catch { throw new Error('Website hostname could not be resolved'); }
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Website hostname resolves to a local or reserved network address');
  }
  return { url, hostname, addresses };
}

async function startSafeProxy() {
  const proxy = http.createServer(async (request, response) => {
    try {
      const target = new URL(request.url);
      if (target.protocol !== 'http:' || (target.port && target.port !== '80')) {
        response.writeHead(403).end();
        return;
      }
      const validated = await validatePublicUrl(target.href);
      const ip = validated.addresses.find((entry) => entry.family === 4) || validated.addresses[0];
      const headers = { ...request.headers, host: target.host };
      delete headers['proxy-connection'];
      const upstream = http.request({
        hostname: ip.address,
        family: ip.family,
        port: 80,
        method: request.method,
        path: target.pathname + target.search,
        headers,
        agent: false,
        timeout: 10_000
      }, (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      upstream.on('timeout', () => upstream.destroy(new Error('Upstream timed out')));
      upstream.on('error', () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
    } catch {
      if (!response.headersSent) response.writeHead(403);
      response.end();
    }
  });

  proxy.on('connect', async (request, client, head) => {
    let upstream;
    client.on('error', () => upstream?.destroy());
    try {
      const target = new URL('https://' + request.url);
      if (target.username || target.password || target.port && target.port !== '443') throw new Error('Blocked proxy destination');
      const validated = await validatePublicUrl(target.href);
      const ip = validated.addresses.find((entry) => entry.family === 4) || validated.addresses[0];
      upstream = net.connect({ host: ip.address, family: ip.family, port: 443 });
      upstream.on('error', () => client.destroy());
      upstream.setTimeout(10_000, () => upstream.destroy(new Error('Upstream timed out')));
      upstream.once('connect', () => {
        if (client.destroyed) {
          upstream.destroy();
          return;
        }
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        client.pipe(upstream);
        upstream.pipe(client);
      });
    } catch {
      client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      upstream?.destroy();
    }
  });
  const sockets = new Set();
  proxy.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', resolve);
  });
  proxy.destroyConnections = () => {
    for (const socket of sockets) socket.destroy();
  };
  return proxy;
}

function requestPinnedHead(url, address) {
  return new Promise((resolve, reject) => {
    const client = (url.protocol === 'https:' ? https : http).request(url, {
      method: 'HEAD',
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address: address.address, family: address.family }]);
        else callback(null, address.address, address.family);
      }
    }, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;
      response.destroy();
      resolve({ status, headers: { get: (name) => name.toLowerCase() === 'location' ? location || null : null } });
    });
    client.setTimeout(10_000, () => client.destroy(new Error('Website request timed out')));
    client.once('error', reject);
    client.end();
  });
}

export async function validateRedirectChain(input, { resolver = dns.lookup, fetchImpl, maxRedirects = MAX_REDIRECTS } = {}) {
  let current = input;
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const validated = await validatePublicUrl(current, resolver);
    let response;
    try {
      const pinnedAddress = validated.addresses.find((entry) => entry.family === 4) || validated.addresses[0];
      response = fetchImpl
        ? await fetchImpl(validated.url, { method: 'HEAD', redirect: 'manual' })
        : await requestPinnedHead(validated.url, pinnedAddress);
    } catch { throw new Error('Website could not be reached safely'); }
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { url: validated.url, hostname: validated.hostname, addresses: validated.addresses };
    }
    const location = response.headers.get('location');
    if (!location) throw new Error('Website returned an invalid redirect');
    if (redirects === maxRedirects) throw new Error('Website redirected too many times');
    current = new URL(location, validated.url).href;
  }
  throw new Error('Website redirected too many times');
}

function toVerifiedFindings(lhr) {
  const findings = [];
  for (const categoryId of CATEGORY_IDS) {
    for (const ref of lhr.categories?.[categoryId]?.auditRefs || []) {
      const audit = lhr.audits?.[ref.id];
      if (!audit || audit.score !== 0 || audit.scoreDisplayMode === 'manual' || audit.scoreDisplayMode === 'notApplicable') continue;
      findings.push({
        category: categoryId,
        auditId: ref.id,
        title: String(audit.title || ref.id).slice(0, 300),
        description: String(audit.description || '').slice(0, 2000),
        displayValue: String(audit.displayValue || '').slice(0, 300)
      });
      if (findings.length >= 40) return findings;
    }
  }
  return findings;
}

export async function analyzeWebsite(input) {
  if (auditRunning) {
    const error = new Error('A website analysis is already running. Try again shortly.');
    error.statusCode = 429;
    throw error;
  }
  auditRunning = true;
  let browser;
  let proxy;
  let timer;
  try {
    const target = await validateRedirectChain(input);
    proxy = await startSafeProxy();
    const proxyPort = proxy.address().port;
    browser = await launch({
      chromePath: EDGE_PATH,
      chromeFlags: [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--proxy-server=http://127.0.0.1:' + proxyPort,
        '--proxy-bypass-list=<-loopback>'
      ],
      connectionPollInterval: 250,
      maxConnectionRetries: 24,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Website analysis timed out'), { statusCode: 504 })), AUDIT_TIMEOUT_MS);
      timer.unref?.();
    });
    const result = await Promise.race([
      lighthouse(target.url.href, { port: browser.port, output: 'json', logLevel: 'error', onlyCategories: CATEGORY_IDS, maxWaitForLoad: 30_000 }),
      timeout
    ]);
    const lhr = result?.lhr;
    if (!lhr?.categories) throw new Error('Lighthouse did not return category results');
    if (lhr.runtimeError) throw new Error('Lighthouse could not audit the website: ' + lhr.runtimeError.message);
    return {
      analyzedUrl: target.url.href.slice(0, 2048),
      analyzedAt: new Date(),
      scores: {
        performance: lhr.categories.performance?.score ?? null,
        accessibility: lhr.categories.accessibility?.score ?? null,
        bestPractices: lhr.categories['best-practices']?.score ?? null,
        seo: lhr.categories.seo?.score ?? null
      },
      findings: toVerifiedFindings(lhr)
    };
  } finally {
    clearTimeout(timer);
    if (browser) await Promise.resolve().then(() => browser.kill()).catch(() => {});
    if (proxy) {
      proxy.destroyConnections();
      await new Promise((resolve) => proxy.close(resolve));
    }
    auditRunning = false;
  }
}
