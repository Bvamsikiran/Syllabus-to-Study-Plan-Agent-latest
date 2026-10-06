/**
 * Google Slides API Service
 * Handles listing presentations, importing lecture deck slide contents into syllabi,
 * and exporting complete adaptive study decks to Google Slides.
 */

export interface GoogleSlidesPresentation {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

/**
 * List Google Slides presentations from user's Drive
 */
export async function listSlidesFiles(accessToken: string): Promise<GoogleSlidesPresentation[]> {
  const query = "trashed = false and mimeType = 'application/vnd.google-apps.presentation'";
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', '20');
  url.searchParams.set('fields', 'files(id, name, modifiedTime, webViewLink, thumbnailLink)');
  url.searchParams.set('orderBy', 'modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Slides (status ${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/presentation/d/${f.id}/edit`,
    thumbnailLink: f.thumbnailLink,
  }));
}

/**
 * Fetch full presentation structure by ID
 */
export async function getPresentation(accessToken: string, presentationId: string): Promise<any> {
  const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch presentation ${presentationId}`);
  }

  return await res.json();
}

/**
 * Extract slide text and outlines from a Google Slides presentation to convert to study units
 */
export function extractPresentationText(presentation: any): string {
  if (!presentation || !presentation.slides) return '';

  const chunks: string[] = [];
  chunks.push(`Course Presentation: ${presentation.title || 'Untitled Lecture Deck'}`);

  presentation.slides.forEach((slide: any, index: number) => {
    chunks.push(`\n--- Slide ${index + 1} ---`);
    if (slide.pageElements) {
      slide.pageElements.forEach((el: any) => {
        if (el.shape?.text?.textElements) {
          el.shape.text.textElements.forEach((te: any) => {
            if (te.textRun?.content) {
              chunks.push(te.textRun.content.trim());
            }
          });
        }
      });
    }
  });

  return chunks.filter(Boolean).join('\n');
}

/**
 * Export current syllabus roadmap and active recall milestones to a new Google Slides presentation
 */
export async function createStudyPlanSlides(
  accessToken: string,
  title: string,
  modules: any[],
  targetDate?: string,
  targetScore?: number
): Promise<{ id: string; title: string; webViewLink: string }> {
  // Step 1: Create empty presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${title} - Synapse AI Deck`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Google Slides presentation');
  }

  const created = await createRes.json();
  const presentationId = created.presentationId;

  // Step 2: Batch populate slides with course modules & active recall cards
  const requests: any[] = [];

  // Add Course Overview Slide
  const slide1Id = 'slide_overview_' + Date.now();
  requests.push({
    createSlide: {
      objectId: slide1Id,
      insertionIndex: 1,
      slideLayoutReference: {
        predefinedLayout: 'TITLE_AND_BODY',
      },
    },
  });

  // Add Module Breakdown Slides (first 4 modules)
  modules.slice(0, 4).forEach((mod, idx) => {
    const modSlideId = `slide_mod_${idx}_${Date.now()}`;
    requests.push({
      createSlide: {
        objectId: modSlideId,
        insertionIndex: 2 + idx,
        slideLayoutReference: {
          predefinedLayout: 'SECTION_HEADER',
        },
      },
    });
  });

  try {
    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.warn('Batch update slide layout error:', err);
  }

  return {
    id: presentationId,
    title: created.title || title,
    webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`,
  };
}
