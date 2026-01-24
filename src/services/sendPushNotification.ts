import admin from "../config/firebase";

export interface PushMessage {
  title: string;
  description: string;

  // Optional extras for your clients
  data?: Record<string, string>;
}

/**
 * ✅ Send push notification using Firebase Admin SDK (FCM HTTP v1)
 * - No FCM_SERVER_KEY required
 * - Works with service account JSON
 * - Supports chunking (max 500 tokens per request)
 * - Returns success/failure + invalid tokens
 */
export async function sendPushNotification(
  message: PushMessage,
  tokens: string[]
): Promise<{
  success: number;
  failure: number;
  responses: any[];
  invalidTokens: string[];
}> {
  if (!tokens?.length) {
    return { success: 0, failure: 0, responses: [], invalidTokens: [] };
  }

  const chunkSize = 500;
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += chunkSize) {
    chunks.push(tokens.slice(i, i + chunkSize));
  }

  let success = 0;
  let failure = 0;
  const responses: any[] = [];
  const invalidTokens: string[] = [];

  for (const chunk of chunks) {
    const payload = {
      notification: {
        title: message.title,
        body: message.description,
      },
      data: message.data || {},
      tokens: chunk,
    };

    try {
      const result = await admin.messaging().sendEachForMulticast(payload);

      success += result.successCount;
      failure += result.failureCount;

      responses.push({
        successCount: result.successCount,
        failureCount: result.failureCount,
      });

      // ✅ collect invalid tokens
      result.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = (r.error as any)?.code;

          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });
    } catch (err: any) {
      console.error("❌ Firebase Admin push error:", err?.message || err);

      failure += chunk.length;

      responses.push({
        error: true,
        message: err?.message || "Firebase Admin error",
      });
    }
  }

  return { success, failure, responses, invalidTokens };
}
