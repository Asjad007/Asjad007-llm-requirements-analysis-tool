import { useEffect, useMemo, useRef, useState } from "react";
import AppDataTable from "../components/AppDataTable";
import {
  createReferenceEntry,
  deleteReferenceEntry,
  importReferenceDataset,
  updateReferenceEntry,
} from "../services/api";
import { buildReferenceComparison } from "../utils/referenceDatasetMetrics";

function formatMatch(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not available";
}

function ReferenceFormModal({ entry, projects, requirements, loading, onClose, onSubmit }) {
  const [projectId, setProjectId] = useState(entry?.project_id ? String(entry.project_id) : "");
  const [requirementId, setRequirementId] = useState(entry?.requirement_id ? String(entry.requirement_id) : "");
  const [originalText, setOriginalText] = useState(entry?.original_requirement_text || "");
  const [referenceType, setReferenceType] = useState(entry?.reference_type || "");
  const [referencePriority, setReferencePriority] = useState(entry?.reference_priority || "");
  const [referenceAmbiguityStatus, setReferenceAmbiguityStatus] = useState(entry?.reference_ambiguity_status || "");
  const [referenceAcceptanceCriteria, setReferenceAcceptanceCriteria] = useState(entry?.reference_acceptance_criteria || "");
  const [referenceTestCases, setReferenceTestCases] = useState(entry?.reference_test_cases || "");
  const [referenceNotes, setReferenceNotes] = useState(entry?.reference_notes || "");

  useEffect(() => {
    setProjectId(entry?.project_id ? String(entry.project_id) : "");
    setRequirementId(entry?.requirement_id ? String(entry.requirement_id) : "");
    setOriginalText(entry?.original_requirement_text || "");
    setReferenceType(entry?.reference_type || "");
    setReferencePriority(entry?.reference_priority || "");
    setReferenceAmbiguityStatus(entry?.reference_ambiguity_status || "");
    setReferenceAcceptanceCriteria(entry?.reference_acceptance_criteria || "");
    setReferenceTestCases(entry?.reference_test_cases || "");
    setReferenceNotes(entry?.reference_notes || "");
  }, [entry]);

  if (!entry) return null;

  const filteredRequirements = projectId
    ? requirements.filter((item) => String(item.project_id || "") === String(projectId))
    : requirements;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>{entry.id ? "Edit Reference Entry" : "Add Reference Entry"}</h2>
            <p>Manually labelled benchmark data used to compare LLM-generated outputs and human-validated outputs.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <div className="workspace-grid">
          <label className="project-filter-label">
            <span>Project</span>
            <select className="project-select" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">All / Unspecified</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>

          <label className="project-filter-label">
            <span>Link to Requirement</span>
            <select className="project-select" value={requirementId} onChange={(event) => setRequirementId(event.target.value)}>
              <option value="">Auto-match / Leave unlinked</option>
              {filteredRequirements.map((item) => (
                <option key={`${item.requirement_id}-${item.analysis_id}`} value={item.requirement_id}>
                  {`REQ-${String(item.requirement_id).padStart(3, "0")} - ${item.original_text.slice(0, 80)}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-label">Original Requirement Text</label>
        <textarea className="requirement-textarea" value={originalText} onChange={(event) => setOriginalText(event.target.value)} />

        <div className="workspace-grid">
          <label className="project-filter-label">
            <span>Reference Type / Classification</span>
            <input className="project-input" value={referenceType} onChange={(event) => setReferenceType(event.target.value)} />
          </label>
          <label className="project-filter-label">
            <span>Reference Priority</span>
            <input className="project-input" value={referencePriority} onChange={(event) => setReferencePriority(event.target.value)} />
          </label>
          <label className="project-filter-label">
            <span>Reference Ambiguity Status</span>
            <input className="project-input" value={referenceAmbiguityStatus} onChange={(event) => setReferenceAmbiguityStatus(event.target.value)} />
          </label>
        </div>

        <label className="form-label">Reference Acceptance Criteria</label>
        <textarea className="review-notes-textarea" value={referenceAcceptanceCriteria} onChange={(event) => setReferenceAcceptanceCriteria(event.target.value)} />

        <label className="form-label">Reference Test Cases</label>
        <textarea className="review-notes-textarea" value={referenceTestCases} onChange={(event) => setReferenceTestCases(event.target.value)} />

        <label className="form-label">Reference Notes</label>
        <textarea className="review-notes-textarea" value={referenceNotes} onChange={(event) => setReferenceNotes(event.target.value)} />

        <div className="modal-actions">
          <button
            className="primary-button"
            disabled={loading}
            onClick={() =>
              onSubmit({
                project_id: projectId ? Number(projectId) : null,
                requirement_id: requirementId ? Number(requirementId) : null,
                original_requirement_text: originalText,
                reference_type: referenceType,
                reference_priority: referencePriority,
                reference_ambiguity_status: referenceAmbiguityStatus,
                reference_acceptance_criteria: referenceAcceptanceCriteria,
                reference_test_cases: referenceTestCases,
                reference_notes: referenceNotes,
              })
            }
          >
            {loading ? "Saving..." : "Save Reference Entry"}
          </button>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ReferenceDataset({ references = [], projects = [], history = [], isLoading = false, error = "", onRefresh }) {
  const [projectFilter, setProjectFilter] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState(error || "");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPageError(error || "");
  }, [error]);

  const filteredReferences = useMemo(
    () => (
      projectFilter
        ? references.filter((item) => String(item.project_id || "") === String(projectFilter))
        : references
    ),
    [references, projectFilter]
  );

  const comparison = useMemo(
    () => buildReferenceComparison(filteredReferences, history),
    [filteredReferences, history]
  );

  async function handleSave(payload) {
    if (!payload.original_requirement_text.trim()) {
      setPageError("Original requirement text is required.");
      return;
    }

    setSaving(true);
    setPageError("");

    try {
      if (editingEntry?.id) {
        await updateReferenceEntry(editingEntry.id, payload);
      } else {
        await createReferenceEntry(payload);
      }
      setEditingEntry(null);
      await onRefresh?.();
    } catch (saveError) {
      setPageError(saveError.message || "Failed to save reference dataset entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(referenceId) {
    setPageError("");
    try {
      await deleteReferenceEntry(referenceId);
      await onRefresh?.();
    } catch (deleteError) {
      setPageError(deleteError.message || "Failed to delete reference dataset entry.");
    }
  }

  async function handleImportFile(file) {
    if (!file) return;

    try {
      setPageError("");
      setImportMessage("");
      const response = await importReferenceDataset(file, projectFilter);
      setImportMessage(`${response.imported_count} reference entries imported. ${response.linked_count} linked to analysed requirements.`);
      await onRefresh?.();
    } catch (importError) {
      setPageError(importError.message || "Failed to import reference dataset CSV.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const columns = [
    {
      key: "project_name",
      header: "Project",
      width: "12%",
      searchValue: (item) => item.project_name || "",
      render: (item) => item.project_name || "Unspecified",
    },
    {
      key: "original_requirement_text",
      header: "Reference Requirement",
      width: "28%",
      cellClassName: "requirement-cell",
      searchValue: (item) => `${item.original_requirement_text} ${item.reference_notes || ""}`,
      render: (item) => item.original_requirement_text,
    },
    {
      key: "reference_type",
      header: "Reference Labels",
      width: "18%",
      searchValue: (item) => `${item.reference_type || ""} ${item.reference_priority || ""} ${item.reference_ambiguity_status || ""}`,
      render: (item) => (
        <div className="history-stack">
          <span>{item.reference_type || "Type N/A"}</span>
          <span className="history-subtext">{item.reference_priority || "Priority N/A"}</span>
          <span className="history-subtext">{item.reference_ambiguity_status || "Ambiguity N/A"}</span>
        </div>
      ),
    },
    {
      key: "link_status",
      header: "Linked Requirement",
      width: "16%",
      searchValue: (item) => `${item.requirement_id || ""} ${item.linked_requirement_text || ""}`,
      render: (item) => item.requirement_id ? `REQ-${String(item.requirement_id).padStart(3, "0")}` : "Unlinked",
    },
    {
      key: "comparison",
      header: "Comparison",
      width: "16%",
      searchValue: (item) => item.id,
      render: (item) => {
        const row = comparison.linkedEntries.find((entry) => entry.referenceEntry.id === item.id);
        if (!row) return "Awaiting link";
        return (
          <div className="history-stack">
            <span>{`LLM class: ${formatMatch(row.llmClassificationMatches)}`}</span>
            <span className="history-subtext">{`Human class: ${formatMatch(row.humanClassificationMatches)}`}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "10%",
      cellClassName: "table-actions",
      searchValue: () => "Edit Delete",
      render: (item) => (
        <div className="table-actions">
          <button className="small-button" onClick={() => setEditingEntry(item)}>Edit</button>
          <button className="small-danger-button" onClick={() => handleDelete(item.id)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <section className="panel page-panel data-page-panel">
      <div className="panel-title-row">
        <div>
          <h2>Reference Dataset</h2>
          <p>Manually labelled benchmark data used to compare LLM-generated outputs and human-validated outputs.</p>
        </div>
        <div className="table-actions">
          <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </button>
          <button className="primary-button" onClick={() => setEditingEntry({})}>
            Add Reference Entry
          </button>
        </div>
      </div>

      <div className="project-filter-row">
        <label className="project-filter-label">
          <span>Project Filter</span>
          <select className="project-select" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="document-file-input"
        onChange={(event) => handleImportFile(Array.from(event.target.files || [])[0])}
      />

      {pageError && <div className="error-message">{pageError}</div>}
      {importMessage && <div className="success-message">{importMessage}</div>}

      {!references.length ? (
        <div className="empty-state inline-empty-state">
          <h3>No manually labelled reference dataset has been added yet</h3>
          <p>Human validation metrics are still available, but gold-standard comparison requires reference labels.</p>
        </div>
      ) : (
        <>
          <div className="workflow-note-card">
            <strong>Reference comparison summary</strong>
            <p>{`${comparison.linkedCount} linked reference entries are currently available for optional comparison against LLM-generated output and human final decisions.`}</p>
          </div>

          <div className="workflow-note-card">
            <strong>CSV import format</strong>
            <p>`original_requirement_text`, `reference_type`, `reference_priority`, `reference_ambiguity_status`, `reference_acceptance_criteria`, `reference_test_cases`, and `reference_notes`.</p>
          </div>

          <AppDataTable
            columns={columns}
            rows={filteredReferences}
            rowKey={(item) => item.id}
            loading={isLoading}
            onRefresh={onRefresh}
            searchPlaceholder="Search reference dataset entries..."
            emptyMessage="No reference dataset entries match the selected project."
            footerLabel="reference entries"
            containerClassName="projects-table-shell"
            bodyHeight="min(62vh, 720px)"
          />
        </>
      )}

      <ReferenceFormModal
        entry={editingEntry}
        projects={projects}
        requirements={history}
        loading={saving}
        onClose={() => setEditingEntry(null)}
        onSubmit={handleSave}
      />
    </section>
  );
}
