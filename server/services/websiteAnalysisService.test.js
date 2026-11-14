import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, validatePublicUrl, validateRedirectChain } from './websiteAnalysisService.js';

const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }];

test('allows public HTTP and HTTPS hostnames with public DNS answers', async () => {
  for (const input of ['http://example.com', 'https://example.com/path']) {
    const result = await validatePublicUrl(input, publicResolver);
    assert.equal(result.hostname, 'example.com');
  }
});

test('rejects unsupported schemes, credentials, local names, and private literals', async () => {
  for (const input of [
    'file:///etc/passwd',
    'https://user:pass@example.com',
    'http://localhost',
    'http://printer.local',
    'http://127.0.0.1',
    'http://169.254.169.254',
    'http://[::1]',
    'http://[fd00::1]'
  ]) {
    await assert.rejects(validatePublicUrl(input, publicResolver), input);
  }
  await assert.rejects(validatePublicUrl('https://example.com:8443', publicResolver), /standard public HTTP and HTTPS ports/);
});

test('rejects DNS answers containing any private or reserved address', async () => {
  await assert.rejects(
    validatePublicUrl('https://mixed.example', async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.8', family: 4 }
    ]),
    /local or reserved/
  );
});

test('classifies special-use IP ranges as non-public', () => {
  for (const address of [
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.1.1',
    '172.20.0.1', '192.0.2.1', '192.168.1.1', '198.18.0.1', '203.0.113.4',
    '224.0.0.1', '::1', 'fe80::1', 'fc00::1', '2001:db8::1'
  ]) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('93.184.216.34'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('validates every redirect destination before following it', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url.hostname);
    return url.hostname === 'first.example'
      ? { status: 302, headers: new Headers({ location: 'http://127.0.0.1/private' }) }
      : { status: 200, headers: new Headers() };
  };
  await assert.rejects(
    validateRedirectChain('https://first.example', { resolver: publicResolver, fetchImpl }),
    /Local and private/
  );
  assert.deepEqual(requested, ['first.example']);
});

test('accepts a short redirect chain after resolving each public host', async () => {
  const requested = [];
  const result = await validateRedirectChain('http://first.example', {
    resolver: publicResolver,
    fetchImpl: async (url) => {
      requested.push(url.hostname);
      return url.hostname === 'first.example'
        ? { status: 301, headers: new Headers({ location: 'https://second.example/final' }) }
        : { status: 200, headers: new Headers() };
    }
  });
  assert.deepEqual(requested, ['first.example', 'second.example']);
  assert.equal(result.url.href, 'https://second.example/final');
});
