import { describe, expect, it } from 'vitest';
import { websiteFavicon } from './EntryAvatar';

describe('privacy-conscious optional favicon source', () => {
  it('uses only the original HTTPS origin without path, credentials or referrer',()=>{
    expect(websiteFavicon('https://example.org/path/to/login?token=private')).toBe('https://example.org/favicon.ico');
    expect(websiteFavicon('https://user:secret@example.org/login')).toBe('https://example.org/favicon.ico');
    expect(websiteFavicon('example.com')).toBe('https://example.com/favicon.ico');
  });
  it('never fetches local, numeric, testing or non-HTTPS hosts',()=>{
    for (const host of ['http://example.org','http://192.168.1.1','https://192.168.1.1','https://localhost','http://router.local','https://app.test','ftp://example.org','https://[::1]/']) {
      expect(websiteFavicon(host)).toBeNull();
    }
  });
});
