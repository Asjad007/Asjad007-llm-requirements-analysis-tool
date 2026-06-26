import { useMemo } from "react";
import AppDataTable from "../components/AppDataTable";

const VIEW_COPY = {
  classification: {
    kicker: "Analysis View",
    title: "Classification",
    subtitle: "This view is generated from the main requirements analysis workflow.",
    emptyMessage: "No classified requirements are available yet.",
    columns: [
      { key: "analysis_id", header: "ID", width: "10%", render: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}` },
      { key: "project_name", header: "Project", width: "18%", render: (item) => item.project_name || "Unassigned" },
      { key: "original_text", header: "Requirement", width: "42%" },
      { key: "requirement_type", header: "Classification", width: "15%" },
      { key: "confidence_score", header: "Confidence", width: "15%", render: (item) => `${Math.round(Number(item.confidence_score || 0) * 100)}%` },
    ],
  },
  prioritisation: {
    kicker: "Analysis View",
    title: "Prioritisation",
    subtitle: "This view is generated from the main requirements analysis workflow.",
    emptyMessage: "No prioritised requirements are available yet.",
    columns: [
      { key: "analysis_id", header: "ID", width: "10%", render: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}` },
      { key: "project_name", header: "Project", width: "18%", render: (item) => item.project_name || "Unassigned" },
      { key: "original_text", header: "Requirement", width: "36%" },
      { key: "priority_level", header: "Priority", width: "12%" },
      { key: "priority_reason", header: "Priority Reason", width: "24%" },
    ],
  },
  ambiguity: {
    kicker: "Analysis View",
    title: "Ambiguity Detection",
    subtitle: "This view is generated from the main requirements analysis workflow.",
    emptyMessage: "No ambiguity analysis is available yet.",
    columns: [
      { key: "analysis_id", header: "ID", width: "10%", render: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}` },
      { key: "project_name", header: "Project", width: "18%", render: (item) => item.project_name || "Unassigned" },
      { key: "original_text", header: "Requirement", width: "30%" },
      { key: "ambiguity_status", header: "Ambiguity", width: "12%" },
      { key: "ambiguity_explanation", header: "Explanation", width: "30%" },
    ],
  },
  acceptance: {
    kicker: "Analysis View",
    title: "Acceptance Criteria",
    subtitle: "This view is generated from the main requirements analysis workflow.",
    emptyMessage: "No generated acceptance criteria are available yet.",
    columns: [
      { key: "analysis_id", header: "ID", width: "10%", render: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}` },
      { key: "project_name", header: "Project", width: "18%", render: (item) => item.project_name || "Unassigned" },
      { key: "original_text", header: "Requirement", width: "28%" },
      { key: "acceptance_criteria", header: "Acceptance Criteria", width: "44%" },
    ],
  },
  testcases: {
    kicker: "Analysis View",
    title: "Test Case Generation",
    subtitle: "This view is generated from the main requirements analysis workflow.",
    emptyMessage: "No generated test cases are available yet.",
    columns: [
      { key: "analysis_id", header: "ID", width: "10%", render: (item) => `REQ-${String(item.analysis_id).padStart(3, "0")}` },
      { key: "project_name", header: "Project", width: "18%", render: (item) => item.project_name || "Unassigned" },
      { key: "original_text", header: "Requirement", width: "28%" },
      { key: "test_case", header: "Test Case", width: "44%" },
    ],
  },
};

export default function FocusedAnalysisView({ moduleKey, history = [], onRefresh }) {
  const view = VIEW_COPY[moduleKey] || VIEW_COPY.classification;
  const rows = useMemo(
    () => history.filter((item) => item.original_text),
    [history]
  );

  const columns = view.columns.map((column) => ({
    ...column,
    searchValue: column.searchValue || ((item) => String(item[column.key] || "")),
  }));

  return (
    <section className="panel page-panel data-page-panel">
      <div className="module-header">
        <div>
          <span className="module-kicker">{view.kicker}</span>
          <h2>{view.title}</h2>
          <p>{view.subtitle}</p>
        </div>
      </div>

      <div className="workflow-note-card">
        <strong>Workflow Context</strong>
        <p>Project {"->"} Upload {"->"} Repository {"->"} Human Validation {"->"} Review History {"->"} Evaluation {"->"} Reports</p>
      </div>

      <AppDataTable
        columns={columns}
        rows={rows}
        rowKey={(item) => item.analysis_id}
        onRefresh={onRefresh}
        searchPlaceholder={`Search ${view.title.toLowerCase()} records...`}
        emptyMessage={view.emptyMessage}
        footerLabel="records"
        containerClassName="metrics-table-shell"
        bodyHeight="min(62vh, 720px)"
      />
    </section>
  );
}
