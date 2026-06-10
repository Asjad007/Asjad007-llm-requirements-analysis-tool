const API_BASE_URL = 'http://127.0.0.1:8000/api';

async function handleResponse(response) {
  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function analyseRequirement(requirementText) {
  const response = await fetch(`${API_BASE_URL}/analysis/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirement_text: requirementText, source_type: 'manual' })
  });
  return handleResponse(response);
}

export async function submitReview(analysisId, reviewData) {
  const response = await fetch(`${API_BASE_URL}/review/${analysisId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData)
  });
  return handleResponse(response);
}

export async function getHistory() {
  const response = await fetch(`${API_BASE_URL}/history`);
  return handleResponse(response);
}

export async function deleteHistoryItem(analysisId) {
  const response = await fetch(`${API_BASE_URL}/history/${analysisId}`, { method: 'DELETE' });
  return handleResponse(response);
}
