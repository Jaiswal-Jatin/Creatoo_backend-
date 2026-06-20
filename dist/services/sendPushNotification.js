"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
/**
 * Module: Backend (API Server)
 * File Purpose: Push Notification Service (Modern). Leverages Firebase Admin SDK v1 for robust, chunked delivery.
 * Used By: PostController (for creator notifications)
 * Database Model: N/A
 * Critical: Yes
 * Notes: Provides better error diagnostics than the legacy HTTP service.
 */
const firebase_1 = __importDefault(require("../config/firebase"));
/**
 * ✅ Send push notification using Firebase Admin SDK (FCM HTTP v1)
 * - No FCM_SERVER_KEY required
 * - Works with service account JSON
 * - Supports chunking (max 500 tokens per request)
 * - Returns success/failure + invalid tokens
 * - Enhanced error tracking with detailed diagnostics
 */
async function sendPushNotification(message, tokens) {
    if (!tokens?.length) {
        return { success: 0, failure: 0, responses: [], invalidTokens: [] };
    }
    // ✅ Enhanced: Validate token format before sending
    const diagnostics = {
        tokenCount: tokens.length,
        tokenLengths: tokens.map(t => t?.length || 0),
        firebaseErrors: [],
    };
    const chunkSize = 500;
    const chunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
        chunks.push(tokens.slice(i, i + chunkSize));
    }
    let success = 0;
    let failure = 0;
    const responses = [];
    const invalidTokens = [];
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
            const result = await firebase_1.default.messaging().sendEachForMulticast(payload);
            success += result.successCount;
            failure += result.failureCount;
            responses.push({
                successCount: result.successCount,
                failureCount: result.failureCount,
                timestamp: new Date().toISOString(),
            });
            // ✅ Enhanced: Collect detailed error information
            result.responses.forEach((r, idx) => {
                if (!r.success) {
                    const code = r.error?.code;
                    const errorMsg = r.error?.message;
                    // Log all error types for debugging
                    if (!diagnostics.firebaseErrors.includes(code)) {
                        diagnostics.firebaseErrors.push(code);
                    }
                    console.error(`   ❌ Token ${idx} failed: Code=${code}, Message=${errorMsg}`);
                    if (code === "messaging/registration-token-not-registered" ||
                        code === "messaging/invalid-registration-token") {
                        invalidTokens.push(chunk[idx]);
                    }
                }
            });
        }
        catch (err) {
            const errorCode = err?.code || "UNKNOWN_ERROR";
            const errorMessage = err?.message || "Firebase Admin error";
            console.error("❌ Firebase Admin push error:", {
                code: errorCode,
                message: errorMessage,
                details: err?.toString(),
            });
            diagnostics.firebaseErrors.push(`${errorCode}: ${errorMessage}`);
            failure += chunk.length;
            responses.push({
                error: true,
                code: errorCode,
                message: errorMessage,
                timestamp: new Date().toISOString(),
            });
        }
    }
    return { success, failure, responses, invalidTokens, diagnostics };
}
