const API_BASE_URLS = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

function formatApiError(errorPayload) {
  const detail = errorPayload?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry?.msg && Array.isArray(entry?.loc)) {
          return `${entry.loc.join(".")}: ${entry.msg}`;
        }
        if (entry?.msg) return entry.msg;
        return null;
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof detail === "string") return detail;
  if (typeof errorPayload?.message === "string") return errorPayload.message;

  return "API request failed";
}

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = "API request failed";

    try {
      const errorPayload = await response.json();
      errorMessage = formatApiError(errorPayload);
    } catch {
      const errorText = await response.text();
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }
  return response.json();
}

async function fetchWithBaseFallback(path, options = {}) {
  let lastError = null;

  for (const baseUrl of API_BASE_URLS) {
    try {
      return await fetch(`${baseUrl}${path}`, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to reach the backend API.");
}

export async function analyseRequirement(payload) {
  const response = await fetchWithBaseFallback(`/api/analysis/analyse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function analyseBatchRequirements(payload) {
  const response = await fetchWithBaseFallback(`/api/analysis/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function extractRequirementsDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithBaseFallback(`/api/analysis/extract-document`, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}

export async function reviewAnalysis(analysisId, payload) {
  const response = await fetchWithBaseFallback(`/api/analysis/review/${analysisId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function getHistory() {
  const response = await fetchWithBaseFallback(`/api/history`);
  return handleResponse(response);
}

export async function getProjects() {
  const response = await fetchWithBaseFallback(`/api/projects`);
  return handleResponse(response);
}

export async function createProject(payload) {
  const response = await fetchWithBaseFallback(`/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function updateProject(projectId, payload) {
  const response = await fetchWithBaseFallback(`/api/projects/${projectId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function deleteProject(projectId) {
  const response = await fetchWithBaseFallback(`/api/projects/${projectId}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}

export async function deleteHistoryItem(analysisId) {
  const response = await fetchWithBaseFallback(`/api/history/${analysisId}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}
export async function modifyAndReanalyse(analysisId, payload) {
  const response = await fetchWithBaseFallback(`/api/analysis/modify-reanalyse/${analysisId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function getReferenceDataset() {
  const response = await fetchWithBaseFallback(`/api/reference-dataset`);
  return handleResponse(response);
}

export async function createReferenceEntry(payload) {
  const response = await fetchWithBaseFallback(`/api/reference-dataset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function updateReferenceEntry(referenceId, payload) {
  const response = await fetchWithBaseFallback(`/api/reference-dataset/${referenceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function deleteReferenceEntry(referenceId) {
  const response = await fetchWithBaseFallback(`/api/reference-dataset/${referenceId}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}

export async function importReferenceDataset(file, projectId = "") {
  const formData = new FormData();
  formData.append("file", file);

  if (projectId) {
    formData.append("project_id", String(projectId));
  }

  const response = await fetchWithBaseFallback(`/api/reference-dataset/import`, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}
