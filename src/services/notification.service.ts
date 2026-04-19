/**
 * Module: Backend (API Server)
 * File Purpose: Notification Service (Legacy). Implements legacy FCM HTTP push notifications with token chunking.
 * Used By: Various controllers (via sendPushNotification)
 * Database Model: N/A
 * Critical: Yes (Communication)
 * Notes: Potential redundancy with sendPushNotification.ts (v1 Admin SDK).
 */
import axios from 'axios';

export interface PushMessage {
  title: string;
  description: string;
  // Optional extras for your clients
  data?: Record<string, string>;
}

/**
 * Send a push notification to multiple device tokens using FCM (legacy HTTP).
 * - Chunks tokens (FCM recommends <= 1000; we use 500 to be safe).
 * - If FCM_SERVER_KEY is missing, this becomes a no-op (won't crash your server).
 *
 * Returns a simple aggregate result.
 */
export async function sendPushNotification(
  message: PushMessage,
  tokens: string[]
): Promise<{ success: number; failure: number; responses: any[] }> {
  const key = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
  if (!tokens?.length) return { success: 0, failure: 0, responses: [] };

  // If you haven't configured the server key, just log and exit gracefully.
  if (!key) {
    console.warn('⚠️ FCM_SERVER_KEY not set — skipping push send. Tokens count:', tokens.length);
    return { success: 0, failure: tokens.length, responses: [] };
  }

  const endpoint = 'https://fcm.googleapis.com/fcm/send';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `key=${key}`,
  };

  const chunkSize = 500;
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += chunkSize) {
    chunks.push(tokens.slice(i, i + chunkSize));
  }

  let success = 0;
  let failure = 0;
  const responses: any[] = [];

  for (const registration_ids of chunks) {
    const payload = {
      registration_ids,
      notification: {
        title: message.title,
        body: message.description,
      },
      data: message.data || {},
      priority: 'high',
      android: { priority: 'high' },
    };

    try {
      const { data } = await axios.post(endpoint, payload, { headers, timeout: 10000 });
      // FCM legacy returns: { success, failure, results: [...] }
      success += Number(data?.success || 0);
      failure += Number(data?.failure || 0);
      responses.push(data);
    } catch (err: any) {
      console.error('❌ FCM send error:', err?.response?.data || err?.message || err);
      failure += registration_ids.length;
      responses.push({ error: true, tokens: registration_ids });
    }
  }

  return { success, failure, responses };
}
