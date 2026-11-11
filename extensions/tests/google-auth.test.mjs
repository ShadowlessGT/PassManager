import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

async function withGoogleMocks(fakeBrowser, fakeFetch, callback) {
  const previousBrowser = globalThis.browser;
  const previousFetch = globalThis.fetch;
  globalThis.browser = fakeBrowser;
  globalThis.fetch = fakeFetch;
  try {
    // Module-level browser adapter is selected on first import.
    const module = await import('../shared/google-auth.mjs?case=' + Math.random());
    return await callback(module);
  } finally {
    globalThis.browser = previousBrowser;
    globalThis.fetch = previousFetch;
  }
}
describe('Google -> Firebase authentication guard', () => {
  it('uses Chrome identity OAuth token without persisting a Google access token', async () => {
    let requests = [];
    const browser = {
      runtime: { getManifest: () => ({ oauth2: { client_id:'dummy.apps.googleusercontent.com' } }) },
      identity: { getAuthToken: async () => ({ token:'DUMMY_TEST_GOOGLE_ACCESS_TOKEN' }) }
    };
    const fetcher = async (url, options) => {
      requests.push({url, options});
      return { ok: true, json: async () => ({
        idToken:'TEST_FIREBASE_ID', refreshToken:'TEST_FIREBASE_REFRESH',
        localId:'dummyUid', expiresIn:'3600'
      }) };
    };
    await withGoogleMocks(browser, fetcher, async ({ signInGoogleWithFirebase }) => {
      const session = await signInGoogleWithFirebase({
        projectId:'password-manager-parola',apiKey:'FAKE_TEST_API_KEY'
      });
      assert.equal(session.uid,'dummyUid');
      assert.equal(session.provider,'google.com');
      assert.equal(session.idToken,'TEST_FIREBASE_ID');
      assert.equal(requests.length,1);
      assert.match(requests[0].url,/identitytoolkit.googleapis.com/);
      const body=JSON.parse(requests[0].options.body);
      assert.match(body.postBody,/providerId=google.com/);
      assert.match(body.postBody,/DUMMY_TEST_GOOGLE_ACCESS_TOKEN/);
      assert.equal(JSON.stringify(session).includes('DUMMY_TEST_GOOGLE_ACCESS_TOKEN'),false);
    });
  });
  it('uses Firefox redirect with unpredictable state and rejects state mismatch', async () => {
    const redirect = 'https://parola.test.extensions.allizom.org/parola';
    const browser = {
      runtime: { getManifest: () => ({ browser_specific_settings: { gecko: { id:'parola@test' } } }) },
      identity: {
        getRedirectURL: () => redirect,
        launchWebAuthFlow: async ({url}) => {
          const parsed = new URL(url);
          assert.equal(parsed.searchParams.get('redirect_uri'),redirect);
          assert.equal(parsed.searchParams.get('response_type'),'token');
          assert.ok(parsed.searchParams.get('state')?.length>=40);
          return redirect+'#access_token=FAKE_OAUTH&state=INVALID_STATE';
        }
      }
    };
    let called = false;
    await withGoogleMocks(browser, async () => { called=true;throw new Error('no network'); },
      async ({signInGoogleWithFirebase}) => {
        await assert.rejects(
          signInGoogleWithFirebase({apiKey:'test',projectId:'password-manager-parola',
            googleOAuthClientId:'123.apps.googleusercontent.com'}),
          /OAuth-Zustand/
        );
      });
    assert.equal(called,false);
  });
  it('refuses Google login until OAuth clients are configured', async () => {
    const browser = {
      runtime: { getManifest: () => ({browser_specific_settings: {gecko: {id:'parola@test'}}}) },
      identity: { getRedirectURL: () => 'https://example.test/parola',
        launchWebAuthFlow: async () => {throw new Error('not allowed');} }
    };
    await withGoogleMocks(browser, async () => {throw new Error('unexpected');},
      async ({signInGoogleWithFirebase}) => {
        await assert.rejects(
          signInGoogleWithFirebase({apiKey:'test',projectId:'password-manager-parola'}),
          /noch nicht eingerichtet/
        );
      });
  });
});
