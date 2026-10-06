/**
 * Google Forms API Service
 * Handles listing existing course forms/surveys, importing diagnostic responses,
 * and creating interactive Google Forms quizzes from active recall topics.
 */

export interface GoogleFormItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface FormQuestionPayload {
  title: string;
  options?: string[];
  type: 'RADIO' | 'TEXT' | 'PARAGRAPH_TEXT';
}

/**
 * List Google Forms files from user's Drive
 */
export async function listFormsFiles(accessToken: string): Promise<GoogleFormItem[]> {
  const query = "trashed = false and mimeType = 'application/vnd.google-apps.form'";
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', '20');
  url.searchParams.set('fields', 'files(id, name, modifiedTime, webViewLink)');
  url.searchParams.set('orderBy', 'modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Forms (status ${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/forms/d/${f.id}/edit`,
  }));
}

/**
 * Get full Google Form details by form ID
 */
export async function getForm(accessToken: string, formId: string): Promise<any> {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch form ${formId}`);
  }

  return await res.json();
}

/**
 * Get Form Responses for assessment tracking
 */
export async function getFormResponses(accessToken: string, formId: string): Promise<any> {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch responses for form ${formId}`);
  }

  return await res.json();
}

/**
 * Create a new Google Form quiz from active recall questions
 */
export async function createQuizForm(
  accessToken: string,
  title: string,
  description: string,
  questions: FormQuestionPayload[]
): Promise<{ formId: string; title: string; responderUri?: string; editUri: string }> {
  // Step 1: Create base form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: `${title} - Active Recall Quiz`,
        documentTitle: `${title} Diagnostic`,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Google Form');
  }

  const form = await createRes.json();
  const formId = form.formId;

  // Step 2: Batch add questions
  const requests: any[] = [];

  questions.forEach((q, idx) => {
    if (q.type === 'RADIO' && q.options && q.options.length > 0) {
      requests.push({
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: 'RADIO',
                  options: q.options.map((opt) => ({ value: opt })),
                  shuffle: false,
                },
              },
            },
          },
          location: {
            index: idx,
          },
        },
      });
    } else {
      requests.push({
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: {
                required: true,
                textQuestion: {
                  paragraph: q.type === 'PARAGRAPH_TEXT',
                },
              },
            },
          },
          location: {
            index: idx,
          },
        },
      });
    }
  });

  if (requests.length > 0) {
    try {
      await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    } catch (err) {
      console.warn('Batch update form questions error:', err);
    }
  }

  return {
    formId,
    title: form.info?.title || title,
    responderUri: form.responderUri,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
  };
}
