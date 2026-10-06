/**
 * Google Gmail API Service
 * Handles email notifications, sending study schedules, and reading course announcement emails
 */

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailEmailPreview {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

/**
 * List recent emails (can filter for syllabus, exam, course, homework)
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = 'syllabus OR course OR exam OR "study guide" OR assignment'
): Promise<GmailEmailPreview[]> {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', '15');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch Gmail messages (status ${res.status})`
    );
  }

  const data = await res.json();
  const messages: { id: string; threadId: string }[] = data.messages || [];

  // Fetch headers & snippet for each message
  const previews: GmailEmailPreview[] = await Promise.all(
    messages.slice(0, 8).map(async (msg) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!detailRes.ok) return { id: msg.id, threadId: msg.threadId, snippet: '' };
        const detail = await detailRes.json();
        const headers: GmailMessageHeader[] = detail.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detail.snippet || '',
          subject,
          from,
          date,
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId, snippet: '' };
      }
    })
  );

  return previews;
}

/**
 * Send an email directly using Gmail API
 */
export async function sendEmailViaGmail(
  accessToken: string,
  recipient: string,
  subject: string,
  bodyHtml: string
): Promise<{ id: string; threadId: string }> {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${recipient}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    bodyHtml,
  ];
  const message = messageParts.join('\r\n');

  // Base64url encode the message
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to send email via Gmail (${res.status})`);
  }

  return await res.json();
}
