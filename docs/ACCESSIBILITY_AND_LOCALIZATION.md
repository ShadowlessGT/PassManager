# PassManager – Accessible UX, Theme & 20-Language Release Plan
Status: design and theme foundations in v0.6; full localization is **NOT implemented**.
This checklist is intended for the Android/Capacitor app (not merely the marketing website).
No GitHub Actions, scheduled workflow, or hosted CI may be run. All tests and APK builds are local via the approved Shadowless Bridge / Android Studio.

## Evidence and target users
- Systematic review of mobile-app design guidelines for older adults: simplicity, larger spaced controls, unambiguous language, consistent navigation and clearly marked actions.
  https://mhealth.jmir.org/2023/1/e43186/
- Android accessibility recommends touch targets >=48 dp.
  https://developer.android.com/guide/topics/ui/accessibility/apps
- WCAG 2.2 AA: text contrast >=4.5:1; large text >=3:1; control target size >=24 CSS px (use more spacious >=48 dp for this Android app).
  https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Android theme recommendation: System default / Light / Dark.
  https://developer.android.com/develop/ui/views/theming/darktheme
- Android 13+ per-app language preferences: native locale metadata and in-app selection as appropriate.
  https://developer.android.com/guide/topics/resources/app-languages

## Functional UX acceptance criteria
The first launch MUST default to **Einfach** (Simple); existing user selection is persisted locally.
Never rename this "Senioren-Modus" in the user-facing UI. Older and less technical people benefit, but it is for everyone.
- Tresor home: one primary action ("Neues Passwort speichern"), one conspicuous search, large readable entry list, explicit "Kopieren" labels, three bottom navigation tabs (Tresor, Kategorien, Einstellungen).
- Create in <3 primary steps: What is the entry for? (required); username (optional); password (optional for storage of other sensitive notes). Category is optional. Password generator accessible as a text-labeled action.
- Expert mode retains previous features (custom fields, OCR, history, cloud status, activity insights, import). Switching modes MUST NOT delete anything.
- Category creation: first ask only name; optional icon/color under an expandable section in Simple.
- Destructive actions need plain-language confirmation explaining whether entries are affected. Easy way back from modal, no hidden gestures or long-press-only interactions.
- Typography: Simple UI >=16 px for key body labels, 18-20 px for prominent entry names; Normal / Groß / Sehr groß setting with no horizontal overflow at narrow widths.
- Controls: touch targets >=48 dp or ~48 CSS px in the WebView; >=8 px separation for secondary actions; labels on buttons not icons alone; consistent focus/pressed/disabled states.
- Privacy: color/appearance/text size preferences are local device settings and never contain vault secrets. Never auto-dismiss an unlocked vault to change UI preferences.
- Verify with volunteer testers unfamiliar with password apps; measure first entry creation, copy, category creation, mistaken taps, task time, accessibility scanner and TalkBack on real Android devices.

## Theme
- Appearance preference = system / light / dark; default **system**.
- Follow Android WebView prefers-color-scheme and react live to OS theme changes while app runs.
- Maintain explicit charcoal dark and paper-white light token palettes; muted teal primary actions instead of purple. No gradients required for essential meaning.
- Semantic status colors reserved for success/warning/error; category colors alone MUST NOT communicate what category an entry belongs to.
- Check AA contrast in BOTH themes for real text, secondary labels, disabled states, custom category colors and modal fields.
- Keep Android status/navigation bars and splash consistent with selected appearance where platform support allows. Native Material You dynamic wallpaper colors are OPTIONAL future enhancement and should not defeat accessibility/contrast.

## Localization – 20 TARGET locales (not yet app-supported)
The portfolio's agreed target codes are:
1. en English
2. de Deutsch
3. tr Türkçe
4. es Español
5. fr Français
6. it Italiano
7. pt Português
8. nl Nederlands
9. pl Polski
10. ru Русский
11. uk Українська
12. ar العربية (RTL)
13. zh 中文 (confirm Hans/Hant market variants)
14. ja 日本語
15. ko 한국어
16. hi हिन्दी
17. id Bahasa Indonesia
18. sv Svenska
19. cs Čeština
20. ro Română

**Current v0.5/v0.6 audit:** the React TSX components contain hardcoded German UI labels; there is no centralized i18n catalog in the current app. The marketing site or other projects' 20-language output do NOT constitute PassManager Android app localization. Adding a locale list alone also does not constitute translation.

### Required architecture
- Extract ALL user-facing strings from TSX, helper classes, OCR, importer, Firebase/backup errors, biometric dialogs and configuration into typed translation keys. Prefer one source catalog with typed key validation and ICU-style plural/variable interpolation.
- Supply professionally reviewed dictionaries for **every 20** locale; use a tracked translation coverage matrix. Do not advertise an unfinished locale in the in-app picker or Android localeConfig.
- Preferred language: device language if available, otherwise English once English is fully translated; manual language override in Settings, including a native self-name label for every language. Keep existing device-local preferences and securely encrypted vault data unchanged.
- Android 13+ per-app system language integration (localeConfig / native bridge) must be consistent with the Capacitor WebView's i18n runtime; do not just translate Android strings.xml.
- Keep untranslated user-supplied entry titles, categories, usernames and URLs untouched. Format times/counts/plurals using Intl for the chosen locale.
- RTL for Arabic, including logical CSS properties, action direction and number input behavior; test overflow and IME for long Turkish, German, Hindi, Japanese, Russian and Arabic strings.
- All onboarding, lock screen, validation, category picker, simple and expert mode, subscription/license terms, notices/toasts, privacy, biometric and OCR states must be translated, not just navigation.
- Automated CI-free local tests: key coverage, missing dictionary keys, interpolation preservation, fallback, pseudo-locales with 40% expansion, screenshot regression at 320-430 CSS px, TalkBack labels, font scaling, accessibility.
- Release gate: zero German strings when English selected, zero English fallback when any officially completed locale selected (except designated product names), no missing keys, 20/20 locales covered and native app language picker verified.
- Keep website-generated SEO translations a separate layer from installed app localization. No hand-maintained duplicate marketing pages.

## Future improvement roadmap
1. v0.6: preference migration (System/Light/Dark; simple text size), initial accessible theme and category optional controls.
2. Extract all app strings to a central translation catalog; finish English + German + Turkish and validate complete coverage before exposing.
3. Complete the remaining 17 translations and run automated completeness and manual linguistic review on Android.
4. Android TalkBack, dynamic font scale, lifecycle, license/onboarding and language RTL acceptance tests.
5. Optional Material You wallpaper dynamic accent after semantic contrast validation.
