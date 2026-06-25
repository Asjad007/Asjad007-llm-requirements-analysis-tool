import Analyse from './Analyse';
import { isReviewedStatus } from '../utils/reviewStatuses';

const moduleCopy = {
  classification: { kicker: 'Objective 1', title: 'Requirement Classification', description: 'Classify submitted requirements into functional, non-functional, mixed, or unclear categories.' },
  prioritisation: { kicker: 'Objective 2', title: 'Requirement Prioritisation', description: 'Estimate implementation priority and explain the reason behind the priority decision.' },
  ambiguity: { kicker: 'Objective 3', title: 'Ambiguity Detection', description: 'Identify unclear language, vague terms, missing measurable criteria, and improvement suggestions.' },
  acceptance: { kicker: 'Objective 4', title: 'Acceptance Criteria Generation', description: 'Generate testable acceptance criteria from natural-language requirements.' },
  testcases: { kicker: 'Objective 5', title: 'Test Case Generation', description: 'Generate one test case per requirement to support early validation and traceability.' }
};

export default function ModulePage({ moduleKey, title, history, onAnalysed, projects, selectedProjectId, onProjectChange }) {
  const copy = moduleCopy[moduleKey] || { kicker: 'Module', title, description: 'Professional module view for the LLM-assisted requirements analysis platform.' };
  return (
    <div className="module-page wide-module-page">
      <section className="module-hero"><span>{copy.kicker}</span><h2>{copy.title}</h2><p>{copy.description}</p></section>
      <Analyse onAnalysed={onAnalysed} projects={projects} selectedProjectId={selectedProjectId} onProjectChange={onProjectChange} />
      <section className="panel evidence-panel">
        <h3>Module Evidence</h3>
        <p>This module maps directly to the dissertation objectives and stores generated outputs in the shared requirements repository.</p>
        <div className="evidence-grid">
          <div><strong>{history.length}</strong><span>Total analyses</span></div>
          <div><strong>{history.filter((x) => isReviewedStatus(x.review_decision)).length}</strong><span>Reviewed outputs</span></div>
          <div><strong>{history.filter((x) => String(x.ambiguity_status).toLowerCase().includes('ambiguous')).length}</strong><span>Ambiguous items</span></div>
        </div>
      </section>
    </div>
  );
}
