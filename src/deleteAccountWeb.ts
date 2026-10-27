import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const form = document.querySelector<HTMLFormElement>('#deletion-form')!;
const status = document.querySelector<HTMLElement>('#status')!;
const submit = document.querySelector<HTMLButtonElement>('#submit')!;
form.addEventListener('submit', async event => {
  event.preventDefault();
  const email = (document.querySelector<HTMLInputElement>('#email')!.value || '').trim();
  const password = document.querySelector<HTMLInputElement>('#password')!.value;
  const confirm = document.querySelector<HTMLInputElement>('#confirm')!.value;
  if (confirm !== 'LÖSCHEN') { status.textContent = 'Bitte das Wort LÖSCHEN exakt eingeben.'; return; }
  if (Object.values(config).some(v => !v)) { status.textContent = 'Firebase-Kontolöschung ist noch nicht eingerichtet.'; return; }
  submit.disabled = true;
  status.textContent = 'Konto wird geprüft …';
  const app = initializeApp(config);
  const auth = getAuth(app);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const callable = httpsCallable<{confirm:string}, {deleted:boolean}>(getFunctions(app,'europe-west3'),'deleteOwnAccount');
    const response = await callable({confirm:'DELETE'});
    if (!response.data.deleted) throw new Error('Deletion not confirmed');
    status.textContent = 'Dein Firebase-Konto und die Cloud-Daten wurden gelöscht.';
    form.reset(); form.hidden = true;
  } catch {
    status.textContent = 'Die Löschung war nicht erfolgreich. Prüfe Zugangsdaten und die Serververbindung. Bei Problemen wende dich bitte an den Support.';
  } finally {
    await signOut(auth).catch(() => {});
    document.querySelector<HTMLInputElement>('#password')!.value = '';
    submit.disabled = false;
  }
});