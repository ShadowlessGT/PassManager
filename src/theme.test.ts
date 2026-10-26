import {describe,it,expect} from 'vitest';
import {resolveAppearance,APPEARANCE_CHOICES} from './theme';
import {DEFAULT_PREFERENCES,normalizePreferences} from './preferences';

describe('appearance and accessibility settings',()=>{
  it('offers only two visible theme choices without a System entry',()=>{
    expect(APPEARANCE_CHOICES.map(([id])=>id)).toEqual(['light','dark']);
  });
  it('follows the current Android/browser theme when selected',()=>{
    expect(resolveAppearance('system',true)).toBe('dark');
    expect(resolveAppearance('system',false)).toBe('light');
  });
  it('honors explicit overrides',()=>{
    expect(resolveAppearance('dark',false)).toBe('dark');
    expect(resolveAppearance('light',true)).toBe('light');
  });
  it('starts simple, follows system and offers larger text',()=>{
    expect(DEFAULT_PREFERENCES.mode).toBe('simple');
    expect(DEFAULT_PREFERENCES.appearance).toBe('system');
    expect(DEFAULT_PREFERENCES.textSize).toBe('large');
  });
  it('migrates previous local settings without changing lock timers',()=>{
    const old={mode:'expert',backgroundLockMs:60000,idleLockMs:600000};
    const migrated=normalizePreferences(old);
    expect(migrated).toMatchObject({...old,appearance:'system',textSize:'large'});
  });
  it('rejects unknown theme or size values',()=>{
    expect(normalizePreferences({appearance:'purple',textSize:'tiny'})).toMatchObject({appearance:'system',textSize:'large'});
  });
});
