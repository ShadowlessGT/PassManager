import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { sealSession } from '../shared/google-handoff.mjs';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
const redirect='https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/parola';
const key='AIzaSyDummyLocalOnly1234567890123456789012';
async function withBrowser({provider='google.com',uid='testUser12345'}={}) {
  const previous={chrome:globalThis.chrome,browser:globalThis.browser,fetch:globalThis.fetch};
  let flowCount=0,lookupCount=0;
  globalThis.chrome={identity:{
    getRedirectURL(path){assert.equal(path,'parola');return redirect;},
    async launchWebAuthFlow({url,interactive}){
      assert.equal(interactive,true);
      flowCount++;
      const params=new URL(url).searchParams;
      return sealSession({provider:'google.com',uid:'testUser12345',
        idToken:'DUMMY_FIREBASE_ID',refreshToken:'DUMMY_REFRESH',
        expiresAt:Date.now()+3_000_000},
        {state:params.get('state'),redirect:params.get('redirect'),key:params.get('key')});
    }
  }};
  delete globalThis.browser;
  globalThis.fetch=async (url,options)=>{
    lookupCount++;
    assert.match(url,/identitytoolkit.googleapis.com\/v1\/accounts:lookup/);
    assert.equal(JSON.parse(options.body).idToken,'DUMMY_FIREBASE_ID');
    return {ok:true,json:async()=>({users:[{localId:uid,providerUserInfo:[{providerId:provider}]}]})};
  };
  return { count:()=>({flowCount,lookupCount}),restore:()=>{
    globalThis.chrome=previous.chrome;
    globalThis.browser=previous.browser;
    globalThis.fetch=previous.fetch;
  }};
}
describe('Chrome/Firefox hosted Parola Google login and Firebase identity verification',()=>{
  it('starts a user-interactive encrypted web login and verifies Firebase Google provider',async()=>{
    const mock=await withBrowser();
    try{
      const {signInGoogleWithFirebase}=await import('../shared/google-auth.mjs');
      const result=await signInGoogleWithFirebase({projectId:'password-manager-parola',apiKey:key});
      assert.equal(result.provider,'google.com');
      assert.equal(result.uid,'testUser12345');
      assert.deepEqual(mock.count(),{flowCount:1,lookupCount:1});
    }finally{mock.restore();}
  });
  it('rejects a Firebase account without Google provider',async()=>{
    const mock=await withBrowser({provider:'password'});
    try{
      const {signInGoogleWithFirebase}=await import('../shared/google-auth.mjs');
      await assert.rejects(
        signInGoogleWithFirebase({projectId:'password-manager-parola',apiKey:key}),
        /Google-Konto/);
    }finally{mock.restore();}
  });
  it('rejects a mismatched Firebase UID',async()=>{
    const mock=await withBrowser({uid:'anotherUser'});
    try{
      const {signInGoogleWithFirebase}=await import('../shared/google-auth.mjs');
      await assert.rejects(
        signInGoogleWithFirebase({projectId:'password-manager-parola',apiKey:key}),
        /Google-Konto/);
    }finally{mock.restore();}
  });
  it('rejects wrong Firebase project or missing browser identity API',async()=>{
    const {signInGoogleWithFirebase}=await import('../shared/google-auth.mjs');
    await assert.rejects(signInGoogleWithFirebase({projectId:'wrong'}));
    await assert.rejects(signInGoogleWithFirebase({projectId:'password-manager-parola',apiKey:key}));
  });
});
