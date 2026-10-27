import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-parola-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
const envelope = () => ({v:1,iterations:600000,salt:'A'.repeat(24),nonce:'B'.repeat(16),ciphertext:'C'.repeat(128),updatedAt:Date.now()});
const owner = env.authenticatedContext('owner').firestore();
const stranger = env.authenticatedContext('stranger').firestore();
const anon = env.unauthenticatedContext().firestore();
const vaultOwner = doc(owner,'vaults','owner');
try {
await assertFails(getDoc(doc(anon,'vaults','owner')));
await assertSucceeds(setDoc(vaultOwner,{envelope:envelope(),updatedAt:serverTimestamp()}));
await assertSucceeds(getDoc(vaultOwner));
await assertFails(getDoc(doc(stranger,'vaults','owner')));
await assertFails(setDoc(doc(stranger,'vaults','owner'),{envelope:envelope(),updatedAt:serverTimestamp()}));
await assertFails(deleteDoc(doc(stranger,'vaults','owner')));
await assertFails(setDoc(vaultOwner,{envelope:envelope(),updatedAt:serverTimestamp(),password:'cleartext'}));
await assertFails(setDoc(vaultOwner,{envelope:{...envelope(),ciphertext:9},updatedAt:serverTimestamp()}));
await assertFails(setDoc(vaultOwner,{envelope:{...envelope(),ciphertext:'X'.repeat(900001)},updatedAt:serverTimestamp()}));
await assertFails(setDoc(doc(owner,'accessEntitlements','owner'),{tier:'pro'}));
await assertFails(getDoc(doc(owner,'redeemCodes','test')));
await assertFails(getDoc(doc(owner,'redemptionAttempts','owner')));
await assertFails(setDoc(vaultOwner,{envelope:{...envelope(),nonce:'short'},updatedAt:serverTimestamp()}));
await assertFails(setDoc(vaultOwner,{envelope:envelope(),updatedAt:new Date(0)}));
await assertFails(deleteDoc(doc(stranger, 'redemptionAttempts', 'owner')));
await assertFails(deleteDoc(doc(owner, 'redemptionAttempts', 'owner')));
await assertSucceeds(deleteDoc(vaultOwner));
console.log('PASS: 17 Firestore security rule assertions');
} finally { await env.cleanup(); }
