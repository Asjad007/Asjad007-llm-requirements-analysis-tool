import { useEffect, useState } from "react";
import AppDataTable from "../components/AppDataTable";
import { createProject, deleteProject, updateProject } from "../services/api";

function ProjectFormModal({ project, loading, onClose, onSubmit }) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [domainSystemType, setDomainSystemType] = useState(project?.domain_system_type || "");

  useEffect(() => {
    setName(project?.name || "");
    setDescription(project?.description || "");
    setDomainSystemType(project?.domain_system_type || "");
  }, [project]);

  if (!project) return null;

  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>{project.id ? "Edit Project" : "Create Project"}</h2>
            <p>Define the project context used for requirements analysis.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <label className="form-label">Project Name</label>
        <input className="project-input" value={name} onChange={(event) => setName(event.target.value)} />

        <label className="form-label">Description</label>
        <textarea
          className="review-notes-textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the project scope and purpose."
        />

        <label className="form-label">Domain / System Type</label>
        <input
          className="project-input"
          value={domainSystemType}
          onChange={(event) => setDomainSystemType(event.target.value)}
          placeholder="Example: Healthcare portal, e-commerce platform, ERP"
        />

        <div className="modal-actions">
          <button
            className="primary-button"
            disabled={loading}
            onClick={() =>
              onSubmit({
                name,
                description,
                domain_system_type: domainSystemType,
              })
            }
          >
            {loading ? "Saving..." : "Save Project"}
          </button>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Projects({ projects, isLoading, error, onRefresh }) {
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    setPageError(error || "");
  }, [error]);

  async function handleSaveProject(payload) {
    if (!payload.name.trim()) {
      setPageError("Project name is required.");
      return;
    }

    setSaving(true);
    setPageError("");

    try {
      if (editingProject?.id) {
        await updateProject(editingProject.id, payload);
      } else {
        await createProject(payload);
      }

      setEditingProject(null);
      await onRefresh?.();
    } catch (saveError) {
      setPageError(saveError.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject(projectId) {
    setPageError("");

    try {
      await deleteProject(projectId);
      await onRefresh?.();
    } catch (deleteError) {
      setPageError(deleteError.message || "Failed to delete project.");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Project",
      width: "24%",
      searchValue: (project) => `${project.name} ${project.description || ""}`,
      render: (project) => (
        <div className="history-stack">
          <strong>{project.name}</strong>
          {project.description && <span className="history-subtext">{project.description}</span>}
        </div>
      ),
    },
    {
      key: "domain_system_type",
      header: "Domain / System Type",
      width: "22%",
      searchValue: (project) => project.domain_system_type || "",
      render: (project) => project.domain_system_type || "Not specified",
    },
    {
      key: "requirement_count",
      header: "Requirements",
      width: "12%",
      searchValue: (project) => String(project.requirement_count || 0),
      render: (project) => project.requirement_count || 0,
    },
    {
      key: "created_at",
      header: "Created",
      width: "18%",
      searchValue: (project) => project.created_at,
      render: (project) => new Date(project.created_at).toLocaleString(),
    },
    {
      key: "actions",
      header: "Actions",
      width: "24%",
      cellClassName: "table-actions",
      searchValue: () => "Edit Delete",
      render: (project) => (
        <div className="table-actions">
          <button className="small-button" onClick={() => setEditingProject(project)}>
            Edit
          </button>
          <button
            className="small-danger-button"
            onClick={() => handleDeleteProject(project.id)}
            disabled={(project.requirement_count || 0) > 0}
            title={(project.requirement_count || 0) > 0 ? "Remove project requirements first." : "Delete project"}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="panel page-panel data-page-panel">
      <div className="panel-title-row">
        <div>
          <h2>Projects</h2>
          <p>Create and manage project contexts for project-based requirements analysis.</p>
        </div>
        <button className="primary-button" onClick={() => setEditingProject({})}>
          Create Project
        </button>
      </div>

      {pageError && <div className="error-message">{pageError}</div>}

      <AppDataTable
        columns={columns}
        rows={projects}
        rowKey={(project) => project.id}
        loading={isLoading}
        onRefresh={onRefresh}
        searchPlaceholder="Search projects..."
        emptyMessage="No projects found."
        footerLabel="projects"
        containerClassName="projects-table-shell"
        bodyHeight="min(62vh, 720px)"
      />

      <ProjectFormModal
        project={editingProject}
        loading={saving}
        onClose={() => setEditingProject(null)}
        onSubmit={handleSaveProject}
      />
    </section>
  );
}
