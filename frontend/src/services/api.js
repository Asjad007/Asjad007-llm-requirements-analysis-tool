const API_BASE_URL = "http://127.0.0.1:8000";

async function handleResponse(response) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }
  return response.json();
}

export async function analyseRequirement(payload) {
  const response = await fetch(`${API_BASE_URL}/api/analysis/analyse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function analyseBatchRequirements(payload) {
  const response = await fetch(`${API_BASE_URL}/api/analysis/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function reviewAnalysis(analysisId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/analysis/review/${analysisId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function getHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history`);
  return handleResponse(response);
}

export async function deleteHistoryItem(analysisId) {
  const response = await fetch(`${API_BASE_URL}/api/history/${analysisId}`, {
    method: "DELETE",
  });

  return handleResponse(response);
}
export async function modifyAndReanalyse(analysisId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/analysis/modify-reanalyse/${analysisId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}