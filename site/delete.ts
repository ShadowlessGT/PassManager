import { cloudConfigured, cloudSignIn, cloudDeleteAccount, cloudSignOut } from '../src/cloud';

const form = document.querySelector<HTMLFormElement>('#delete-form')!;
const submit = document.querySelector<HTMLButtonElement>('#submit')!;
const output = document.querySelector<HTMLElement>('#status')!;
form.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.querySelector<HTMLInputElement>('#email')!.value.trim();
  const passField = document.querySelector<HTMLInputElement>('#password')!;
  const password = passField.value;
  const confirmation = document.querySelector<HTMLInputElement>('#confirm')!.value.trim();
  if (confirmation !== 'LÖSCHEN') {
    output.textContent = 'Bitte das Wort LÖSCHEN genau so eingeben.';
    return;
  }
  if (!cloudConfigured) {
    output.textContent = 'Firebase ist für diese Website noch nicht konfiguriert.';
    return;
  }
  submit.disabled = true;
  output.textContent = 'Anmeldung prüfen und Cloud-Daten entfernen …';
  try {
    await cloudSignIn(email, password, false);
    await cloudDeleteAccount(password);
    form.reset();
    form.hidden = true;
    output.textContent = 'Das Firebase-Konto und die Cloud-Sicherung wurden entfernt.';
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    output.textContent = message.includes('SERVER_CLEANUP_REQUIRED')
      ? 'Für dieses Konto ist eine zusätzliche serverseitige Löschung nötig. Das Konto wurde nicht gelöscht.'
      : 'Die Löschung konnte nicht abgeschlossen werden. Bitte prüfe die Kontodaten und versuche es erneut. Das Masterpasswort darf hier nicht eingegeben werden.';
  } finally {
    passField.value = '';
    await cloudSignOut().catch(() => {});
    submit.disabled = false;
  }
});