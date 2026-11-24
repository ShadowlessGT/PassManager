import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordHistory from './PasswordHistory';
import { blankEntry } from './types';

const noop = () => {};
describe('password history detail presentation', () => {
  it('never mounts history rows or old passwords in the collapsed view', () => {
    const entry = {...blankEntry(), password:'current-test-value', passwordHistory:[
      {value:'old-test-value',replacedAt:100}, {value:'current-test-value',replacedAt:200}
    ]};
    const html = renderToStaticMarkup(<PasswordHistory entry={entry} formatDate={String} onReveal={noop} onCopy={noop} onClear={noop}/>);
    expect(html).toContain('Passwort-Historie');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('historical-password');
    expect(html).not.toContain('old-test-value');
    expect(html).not.toContain('current-test-value');
    expect(html).not.toContain('Historie löschen');
  });
  it('does not render history action for a current-password-only import', () => {
    const entry = {...blankEntry(), password:'same-test-value', passwordHistory:[{value:'same-test-value',replacedAt:100}]};
    expect(renderToStaticMarkup(<PasswordHistory entry={entry} formatDate={String} onReveal={noop} onCopy={noop} onClear={noop}/>)).toBe('');
  });
});
