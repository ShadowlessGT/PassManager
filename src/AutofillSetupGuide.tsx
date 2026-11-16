import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useActiveLanguage } from './i18n';
import { autofillGuide } from './autofillGuideI18n';
import './autofillSetupGuide.css';

/** Explains why Android service selection and Chrome service selection
 * are separate; does not request credentials or access other apps. */
export default function AutofillSetupGuide() {
  const language = useActiveLanguage();
  const guide = autofillGuide(language);
  const [expanded, setExpanded] = useState(false);

  return <section className="autofill-setup-guide" aria-label={guide.title}>
    <div className="autofill-setup-guide-intro">
      <BookOpen size={20} aria-hidden="true"/>
      <div>
        <h3>{guide.title}</h3>
        <p>{guide.teaser}</p>
      </div>
    </div>
    <button className="autofill-setup-guide-toggle" type="button"
      aria-expanded={expanded} aria-controls="parola-autofill-help-steps"
      onClick={() => setExpanded(value => !value)}>
      {guide.expand}
      {expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}
    </button>
    {expanded && <div id="parola-autofill-help-steps" className="autofill-setup-guide-steps" hidden={!expanded}>
      <section><h4>{guide.androidTitle}</h4>
        <ol>{guide.androidSteps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
      <section><h4>{guide.chromeTitle}</h4>
        <ol>{guide.chromeSteps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
      <section><h4>{guide.testTitle}</h4>
        <ol>{guide.testSteps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
      <section className="autofill-setup-troubleshooting">
        <h4>{guide.troubleshootingTitle}</h4>
        <p>{guide.troubleshooting}</p>
      </section>
      <p className="autofill-setup-limit"><ShieldCheck size={16} aria-hidden="true"/>{guide.limitation}</p>
    </div>}
  </section>;
}
