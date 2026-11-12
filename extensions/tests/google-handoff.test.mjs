import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { newChallenge, sealSession, openSession, validRedirect, validPublicJwk, fromJSON64 } from '../shared/google-handoff.mjs';
if (!globalThis.crypto) globalThis.crypto=webcrypto;

const chromeRedirect='https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/parola';
const firefoxRedirect='https://a123b456.extensions.allizom.org/';
const session=()=>({provider:'google.com', idToken:'DUMMY_FIREBASE_ID_TOKEN_FOR_TEST',
  refreshToken:'DUMMY_REFRESH_ONLY_FOR_TEST',uid:'testUser1289',expiresAt:Date.now()+3_200_000});

async function simulate(redirect=chromeRedirect) {
  const challenge=await newChallenge(redirect);
  const url=new URL(challenge.url);
  const reply=await sealSession(session(),{
    state:url.searchParams.get('state'),redirect:url.searchParams.get('redirect'),key:url.searchParams.get('key')
  });
  return {challenge,reply};
}
describe('Parola Google web login encrypted browser return',()=>{
  it('round-trips the Firebase session encrypted in Chrome and Firefox',async()=>{
    for(const redirect of [chromeRedirect,firefoxRedirect]){
      const {challenge,reply}=await simulate(redirect);
      const result=await openSession(reply,challenge);
      assert.equal(result.uid,'testUser1289');
      assert.equal(result.provider,'google.com');
      assert.ok(!reply.includes('DUMMY_FIREBASE_ID_TOKEN_FOR_TEST'));
      assert.ok(!reply.includes('DUMMY_REFRESH_ONLY_FOR_TEST'));
      assert.ok(reply.startsWith(redirect+'#'));
    }
  });
  it('rejects suspicious redirect URLs and injected query data',()=>{
    assert.equal(validRedirect(chromeRedirect),true);
    assert.equal(validRedirect(firefoxRedirect),true);
    assert.equal(validRedirect('https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org.evil.test/parola'),false);
    assert.equal(validRedirect('http://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/parola'),false);
    assert.equal(validRedirect(chromeRedirect+'?x=1'),false);
    assert.equal(validRedirect('https://foo.example.com/parola'),false);
  });
  it('rejects callback from another session and wrong private key',async()=>{
    const {challenge,reply}=await simulate();
    const other=await newChallenge(chromeRedirect);
    await assert.rejects(openSession(reply,other));
    await assert.rejects(openSession(reply,{...challenge,privateKey:other.privateKey}));
  });
  it('rejects any altered ciphertext, return state or redirected site',async()=>{
    const {challenge,reply}=await simulate();
    const u=new URL(reply),params=new URLSearchParams(u.hash.slice(1));
    params.set('state','a'.repeat(43));
    u.hash=params.toString();
    await assert.rejects(openSession(u.href,challenge));
    await assert.rejects(openSession(reply.replace('chromiumapp.org','example.com'),challenge));
  });
  it('accepts only an ephemeral ECDH public key, no embedded private key',async()=>{
    const challenge=await newChallenge(chromeRedirect);
    const key=fromJSON64(new URL(challenge.url).searchParams.get('key'));
    assert.equal(validPublicJwk(key),true);
    assert.equal(key.d,undefined);
    assert.equal(validPublicJwk({...key,d:'private!'}),false);
  });
});
