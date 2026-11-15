import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// A regression guard for Android WebView native selects and the import dialog.
// Actual color rendering still needs a light/dark device test.
const css = readFileSync(new URL('./lightThemeContrast.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

describe('light theme contrast regression guards', () => {
  it('loads contrast overrides after other application styles', () => {
    expect(main).toContain("import './lightThemeContrast.css'");
    expect(main.indexOf("import './lightThemeContrast.css'"))
      .toBeGreaterThan(main.indexOf("import './parolaFeatures.css'"));
  });

  it('defines readable foreground/background for the language select and options', () => {
    expect(css).toContain('html[data-theme="light"] :is(.language-select, .gate-language-picker select)');
    expect(css).toMatch(/color:\s*#173355/);
    expect(css).toMatch(/background:\s*#f7faff/);
    expect(css).toContain('color-scheme: light');
    expect(css).toContain('.gate-language-picker select) option');
  });

  it('repairs import controls and other security widgets in light mode', () => {
    expect(css).toContain('html[data-theme="light"] .legacy-db-import');
    expect(css).toContain('html[data-theme="light"] .import-source');
    expect(css).toContain('html[data-theme="light"] .security-danger-options select');
    expect(css).toContain('html[data-theme="light"] .security-bar-col');
  });

  it('preserves explicit dark mode choices', () => {
    expect(css).toContain('html[data-theme="dark"] :is(.language-select, .gate-language-picker select)');
    expect(css).toContain('color-scheme: dark');
  });
});
