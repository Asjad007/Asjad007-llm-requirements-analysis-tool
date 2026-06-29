import { useEffect, useMemo, useState } from "react";
import { REVIEW_STATUSES, getReviewStatusBadgeClass, normalizeReviewStatus } from "../utils/reviewStatuses";
import {
  FIELD_REVIEW_KEYS,
  FIELD_REVIEW_LABELS,
  inferFieldReviewDecisions,
} from "../utils/fieldReviewDecisions";

function badgeClass(value) {
  if (!value) return "badge badge-neutral";

  const normalised = String(value).toLowerCase();

  if (["pending", "reviewed", "approved", "accept", "accepted", "modify", "modified", "reject", "rejected"].includes(normalised)) {
    return getReviewStatusBadgeClass(value);
  }

  if (normalised.includes("high")) return "badge badge-red";
  if (normalised.includes("medium")) return "badge badge-orange";
  if (normalised.includes("low")) return "badge badge-green";
  if (normalised.includes("clear")) return "badge badge-green";
  if (normalised.includes("ambiguous")) return "badge badge-orange";
  if (normalised.includes("incomplete")) return "badge badge-orange";
  if (normalised.includes("conflicting")) return "badge badge-red";
  if (normalised.includes("functional")) return "badge badge-blue";
  if (normalised.includes("non")) return "badge badge-purple";

  return "badge";
}

function formatReqId(id) {
  return `REQ-${String(id).padStart(3, "0")}`;
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

function FieldBlock({ label, children, emptyText = "Not available" }) {
  const hasContent = children !== null && children !== undefined && children !== "";

  return (
    <div className="workspace-field">
      <span className="workspace-field-label">{label}</span>
      <div className="workspace-field-value">
        {hasContent ? children : <span className="history-subtext">{emptyText}</span>}
      </div>
    </div>
  );
}

function EmptyWorkspaceState({ message }) {
  return (
    <div className="workspace-empty">
      <p>{message}</p>
    </div>
  );
}

function getFieldChangeLabel(decision) {
  const status = normalizeReviewStatus(decision);

  if (status === REVIEW_STATUSES.MODIFIED) return "Changed by reviewer";
  if (status === REVIEW_STATUSES.REJECTED) return "Rejected by reviewer";
  if (status === REVIEW_STATUSES.ACCEPTED) return "Accepted as generated";
  return "Pending review";
}

export default function RequirementAnalysisWorkspace({
  item,
  onClose,
  onAccept,
  onOpenModify,
  onOpenReject,
  actionLoading,
  closeLabel = "Back to Repository",
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  useEffect(() => {
    setActiveTab("overview");
  }, [item?.analysis_id]);

  useEffect(() => {
    setIsUpdateMode(false);
  }, [item?.analysis_id, item?.review_decision, item?.reviewed_at, item?.review_updated_at]);

  const reviewDecision = useMemo(
    () => normalizeReviewStatus(item?.review_decision),
    [item?.review_decision]
  );
  const fieldLevelDecisions = useMemo(
    () => inferFieldReviewDecisions(item),
    [item]
  );

  if (!item) return null;

  const hasFinalOutput = reviewDecision === REVIEW_STATUSES.ACCEPTED || reviewDecision === REVIEW_STATUSES.MODIFIED;
  const isPending = reviewDecision === REVIEW_STATUSES.PENDING;
  const canEditRecordedDecision = !isPending && isUpdateMode;
  const isReviewing = actionLoading.type === "review" && actionLoading.analysisId === item.analysis_id;
  const isPreparingModify =
    (actionLoading.type === "open-modify" || actionLoading.type === "modify") &&
    actionLoading.analysisId === item.analysis_id;
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "analysis", label: "LLM Analysis" },
    { id: "validation", label: "Human Validation" },
    { id: "comparison", label: "Comparison" },
    { id: "history", label: "History" },
  ];

  const llmRefinedRequirement = item.final_refined_requirement && reviewDecision === REVIEW_STATUSES.ACCEPTED
    ? item.final_refined_requirement
    : item.original_text;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal workspace-modal">
        <div className="modal-header">
          <div>
            <h2>Requirement Analysis Workspace</h2>
            <p>This workspace supports human-in-the-loop requirements analysis by presenting LLM-generated outputs alongside human validation decisions.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="workspace-tab-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`workspace-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="workspace-layout">
          <div className="workspace-main">
            {activeTab === "overview" && (
              <div className="workspace-section-stack">
                <section className="workspace-section-card">
                  <h3>Requirement Context</h3>
                  <div className="workspace-grid">
                    <FieldBlock label="Requirement ID">{formatReqId(item.analysis_id)}</FieldBlock>
                    <FieldBlock label="Project Name">{item.project_name || "Project not assigned"}</FieldBlock>
                    <FieldBlock label="Created Date">{formatDate(item.created_at)}</FieldBlock>
                    <FieldBlock label="Current Lifecycle Status">
                      <span className={badgeClass(item.requirement_type ? "Analysed" : "Pending")}>{item.requirement_type ? "Analysed" : "Pending"}</span>
                    </FieldBlock>
                    <FieldBlock label="Human Validation Status">
                      <span className={badgeClass(reviewDecision)}>{reviewDecision}</span>
                    </FieldBlock>
                  </div>
                  <FieldBlock label="Original Requirement">{item.original_text}</FieldBlock>
                </section>

                <section className="workspace-section-card">
                  <h3>Decision Snapshot</h3>
                  <div className="workspace-grid">
                    <FieldBlock label="Confidence Score">
                      {item.confidence_score !== null && item.confidence_score !== undefined
                        ? `${Math.round(Number(item.confidence_score) * 100)}%`
                        : "Confidence not available"}
                    </FieldBlock>
                    <FieldBlock label="Reviewed Date/Time">{formatDate(item.reviewed_at || item.review_updated_at)}</FieldBlock>
                  </div>
                  <FieldBlock label="Reviewer Notes">{item.reviewer_notes || item.review_notes}</FieldBlock>
                  {reviewDecision === REVIEW_STATUSES.REJECTED && (
                    <FieldBlock label="Rejection Reason">{item.rejection_reason}</FieldBlock>
                  )}
                </section>
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="workspace-section-stack">
                <section className="workspace-section-card">
                  <h3>LLM Analysis Output</h3>
                  <div className="workspace-grid">
                    <FieldBlock label="Refined Requirement">{llmRefinedRequirement || item.original_text}</FieldBlock>
                    <FieldBlock label="Classification / Type">
                      <span className={badgeClass(item.requirement_type)}>{item.requirement_type || "Not classified"}</span>
                    </FieldBlock>
                    <FieldBlock label="Classification Reason" emptyText="Classification reason is not available from the current model output.">
                      {item.classification_reason}
                    </FieldBlock>
                    <FieldBlock label="Priority">
                      <span className={badgeClass(item.priority_level)}>{item.priority_level || "Not prioritised"}</span>
                    </FieldBlock>
                    <FieldBlock label="Priority Reason">{item.priority_reason}</FieldBlock>
                    <FieldBlock label="Ambiguity Status">
                      <span className={badgeClass(item.ambiguity_status)}>{item.ambiguity_status || "Not available"}</span>
                    </FieldBlock>
                    <FieldBlock label="Ambiguity Explanation">{item.ambiguity_explanation}</FieldBlock>
                  </div>
                  <FieldBlock label="Acceptance Criteria" emptyText="No acceptance criteria generated yet.">{item.acceptance_criteria}</FieldBlock>
                  <FieldBlock label="Test Cases" emptyText="No test cases generated yet.">{item.test_case}</FieldBlock>
                  <FieldBlock label="Improvement Suggestions" emptyText="No improvement suggestions were recorded.">{item.improvement_suggestion}</FieldBlock>
                  <FieldBlock label="Reasoning Summary" emptyText="Reasoning summary is not available from the current model output.">
                    {item.reasoning_summary}
                  </FieldBlock>
                </section>
              </div>
            )}

            {activeTab === "validation" && (
              <div className="workspace-section-stack">
                <section className="workspace-section-card">
                  <h3>Human Validation Panel</h3>
                  <p className="history-subtext">Field-level validation allows the study to measure which Requirements Engineering outputs required the most human intervention.</p>
                  <div className="workspace-grid">
                    <FieldBlock label="Current Decision">
                      <span className={badgeClass(reviewDecision)}>{reviewDecision}</span>
                    </FieldBlock>
                    <FieldBlock label="Reviewed Date/Time">{formatDate(item.reviewed_at || item.review_updated_at)}</FieldBlock>
                  </div>
                  <FieldBlock label="Reviewer Notes">{item.reviewer_notes || item.review_notes}</FieldBlock>
                  {reviewDecision === REVIEW_STATUSES.REJECTED && (
                    <FieldBlock label="Rejection Reason">{item.rejection_reason}</FieldBlock>
                  )}
                  <div className="workspace-section-card">
                    <h4>Field-Level Decisions</h4>
                    <div className="workspace-grid">
                      {FIELD_REVIEW_KEYS.map((key) => (
                        <FieldBlock key={key} label={FIELD_REVIEW_LABELS[key]}>
                          {fieldLevelDecisions[key] ? (
                            <span className={badgeClass(fieldLevelDecisions[key])}>{fieldLevelDecisions[key]}</span>
                          ) : (
                            <span className="history-subtext">Pending</span>
                          )}
                        </FieldBlock>
                      ))}
                    </div>
                  </div>
                  {hasFinalOutput ? (
                    <div className="workspace-grid">
                      <FieldBlock label="Final Human-Reviewed Requirement">{item.final_refined_requirement}</FieldBlock>
                      <FieldBlock label="Final Type">
                        {item.final_type ? <span className={badgeClass(item.final_type)}>{item.final_type}</span> : null}
                      </FieldBlock>
                      <FieldBlock label="Final Priority">
                        {item.final_priority ? <span className={badgeClass(item.final_priority)}>{item.final_priority}</span> : null}
                      </FieldBlock>
                      <FieldBlock label="Final Ambiguity Status">
                        {item.final_ambiguity_status ? <span className={badgeClass(item.final_ambiguity_status)}>{item.final_ambiguity_status}</span> : null}
                      </FieldBlock>
                      <FieldBlock label="Final Acceptance Criteria">{item.final_acceptance_criteria}</FieldBlock>
                      <FieldBlock label="Final Test Cases">{item.final_test_cases}</FieldBlock>
                    </div>
                  ) : (
                    <EmptyWorkspaceState message="Human validation has not been completed yet." />
                  )}
                </section>
              </div>
            )}

            {activeTab === "comparison" && (
              <div className="workspace-section-stack">
                <section className="workspace-section-card">
                  <h3>Comparison</h3>
                  <p className="history-subtext">Original requirement {"->"} LLM-generated output {"->"} final human-validated output.</p>
                  <div className="workspace-comparison-grid">
                    <div className="workspace-compare-card">
                      <h4>1. Original Requirement</h4>
                      <p>{item.original_text}</p>
                    </div>
                    <div className="workspace-compare-card">
                      <h4>2. LLM-Generated Output</h4>
                      <p><strong>Refined Requirement:</strong> {llmRefinedRequirement || item.original_text}</p>
                      <p><strong>Type:</strong> {item.requirement_type || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.classification)})</span></p>
                      <p><strong>Priority:</strong> {item.priority_level || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.priority)})</span></p>
                      <p><strong>Ambiguity:</strong> {item.ambiguity_status || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.ambiguity)})</span></p>
                      <p><strong>Acceptance Criteria:</strong> {item.acceptance_criteria || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.acceptance_criteria)})</span></p>
                      <p><strong>Test Cases:</strong> {item.test_case || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.test_cases)})</span></p>
                    </div>
                    <div className="workspace-compare-card">
                      <h4>3. Final Human-Validated Output</h4>
                      {hasFinalOutput ? (
                        <>
                          <p><strong>Refined Requirement:</strong> {item.final_refined_requirement || "Not available"}</p>
                          <p><strong>Type:</strong> {item.final_type || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.classification)})</span></p>
                          <p><strong>Priority:</strong> {item.final_priority || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.priority)})</span></p>
                          <p><strong>Ambiguity:</strong> {item.final_ambiguity_status || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.ambiguity)})</span></p>
                          <p><strong>Acceptance Criteria:</strong> {item.final_acceptance_criteria || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.acceptance_criteria)})</span></p>
                          <p><strong>Test Cases:</strong> {item.final_test_cases || "Not available"} <span className="history-subtext">({getFieldChangeLabel(fieldLevelDecisions.test_cases)})</span></p>
                        </>
                      ) : (
                        <EmptyWorkspaceState message="Human validation has not been completed yet." />
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "history" && (
              <div className="workspace-section-stack">
                <section className="workspace-section-card">
                  <h3>History</h3>
                  <div className="workspace-grid">
                    <FieldBlock label="Analysis Created">{formatDate(item.created_at)}</FieldBlock>
                    <FieldBlock label="Review Created">{formatDate(item.review_created_at)}</FieldBlock>
                    <FieldBlock label="Review Updated">{formatDate(item.review_updated_at)}</FieldBlock>
                    <FieldBlock label="Reviewed At">{formatDate(item.reviewed_at)}</FieldBlock>
                  </div>
                  <FieldBlock label="Recorded Decision">
                    <span className={badgeClass(reviewDecision)}>{reviewDecision}</span>
                  </FieldBlock>
                  <div className="workspace-grid">
                    {FIELD_REVIEW_KEYS.map((key) => (
                      <FieldBlock key={key} label={`${FIELD_REVIEW_LABELS[key]} Decision`}>
                        {fieldLevelDecisions[key] ? (
                          <span className={badgeClass(fieldLevelDecisions[key])}>{fieldLevelDecisions[key]}</span>
                        ) : (
                          <span className="history-subtext">Pending</span>
                        )}
                      </FieldBlock>
                    ))}
                  </div>
                  <FieldBlock label="Version Link" emptyText="No linked modified version has been recorded.">
                    {item.refined_analysis_result_id || item.modified_into_analysis_id
                      ? `${formatReqId(item.analysis_id)} -> ${formatReqId(item.refined_analysis_result_id || item.modified_into_analysis_id)}`
                      : null}
                  </FieldBlock>
                </section>
              </div>
            )}
          </div>

          <aside className="workspace-sidebar">
            <section className="workspace-sidebar-card">
              <h3>Decision Summary</h3>
              <FieldBlock label="Human Decision">
                <span className={badgeClass(reviewDecision)}>{reviewDecision}</span>
              </FieldBlock>
              <FieldBlock label="Reviewed Date/Time">{formatDate(item.reviewed_at || item.review_updated_at)}</FieldBlock>
              <div className="history-stack">
                <span className={badgeClass(item.priority_level)}>{item.priority_level || "Priority N/A"}</span>
                <span className={badgeClass(item.ambiguity_status)}>{item.ambiguity_status || "Ambiguity N/A"}</span>
              </div>
              <FieldBlock label="Confidence">
                {item.confidence_score !== null && item.confidence_score !== undefined
                  ? `${Math.round(Number(item.confidence_score) * 100)}%`
                  : "Confidence not available"}
              </FieldBlock>
              <FieldBlock label={reviewDecision === REVIEW_STATUSES.REJECTED ? "Rejection Reason" : "Reviewer Notes"}>
                {reviewDecision === REVIEW_STATUSES.REJECTED ? item.rejection_reason : item.reviewer_notes || item.review_notes}
              </FieldBlock>
            </section>

            <section className="workspace-sidebar-card">
              <div className="workspace-heading-row">
                <h3>{isPending ? "Actions" : "Review Recorded"}</h3>
                {!isPending && (
                  <button
                    type="button"
                    className="workspace-edit-toggle"
                    title="Update Review Decision"
                    aria-label="Update Review Decision"
                    disabled={isReviewing || isPreparingModify}
                    onClick={() => setIsUpdateMode((previous) => !previous)}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                )}
              </div>
              <div className="workspace-action-column">
                <button
                  className="success-button"
                  disabled={(!isPending && !canEditRecordedDecision) || isReviewing || isPreparingModify}
                  onClick={() => onAccept(item)}
                >
                  {isReviewing ? "Saving..." : "Accept"}
                </button>
                <button
                  className="warning-button"
                  disabled={(!isPending && !canEditRecordedDecision) || isReviewing || isPreparingModify}
                  onClick={() => onOpenModify(item)}
                >
                  {isPreparingModify ? "Opening..." : "Modify"}
                </button>
                <button
                  className="danger-button"
                  disabled={(!isPending && !canEditRecordedDecision) || isReviewing || isPreparingModify}
                  onClick={() => onOpenReject(item)}
                >
                  {isReviewing ? "Saving..." : "Reject"}
                </button>
                <button className="secondary-button" onClick={onClose}>
                  {closeLabel}
                </button>
              </div>
              {isPending && <p className="history-subtext">Pending outputs are awaiting a recorded human validation decision.</p>}
              {!isPending && !canEditRecordedDecision && (
                <p className="history-subtext">This requirement already has a recorded human validation decision. Use the pencil icon to update the review decision intentionally.</p>
              )}
              {!isPending && canEditRecordedDecision && (
                <p className="workspace-warning-note">You are updating an existing human validation decision. This will replace the current recorded decision.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
