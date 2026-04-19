/**
 * 🔍 DIAGNOSTIC SCRIPT: Analyze Failed Notifications
 * 
 * Usage: npm run ts-node diagnose-failed-notifications.ts
 * 
 * This script helps identify why notifications failed and provides
 * detailed analysis of problematic tokens and users.
 */

import sequelize from "./src/db/sequelize";
import NotificationLog from "./src/models/NotificationLog";
import User from "./src/models/User";
import { Op } from "sequelize";

async function diagnoseFailedNotifications() {
  try {
    console.log("🔍 Starting notification failure diagnosis...\n");

    // ❌ Find all FAILED notifications
    const failedNotifications = await NotificationLog.findAll({
      where: { status: "FAILED" },
      order: [["created_at", "DESC"]],
      limit: 100,
    }) as any[];

    console.log(`\n❌ FAILED NOTIFICATIONS: ${failedNotifications.length}\n`);
    console.log("=" .repeat(80));

    for (const notif of failedNotifications) {
      console.log(`\n📋 Notification ID: ${notif.id}`);
      console.log(`   User ID: ${notif.user_id}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Token: ${notif.token?.substring(0, 50)}...`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Created: ${notif.created_at}`);

      if (notif.error) {
        try {
          const errorObj = JSON.parse(notif.error);
          console.log(`   ❌ Error Details:`);
          console.log(`      - Failure Count: ${errorObj.failureCount}`);
          console.log(`      - Token Length: ${errorObj.tokenLength}`);
          if (errorObj.responses && errorObj.responses[0]) {
            console.log(`      - Firebase Error: ${errorObj.responses[0]?.error?.message || "N/A"}`);
            console.log(`      - Firebase Code: ${errorObj.responses[0]?.error?.code || "N/A"}`);
          }
        } catch (e) {
          console.log(`   Error: ${notif.error.substring(0, 100)}...`);
        }
      }
    }

    // ⚠️ Check for empty/problem tokens in database
    console.log(`\n\n${"=".repeat(80)}`);
    console.log("⚠️ CHECKING DATABASE FOR PROBLEMATIC TOKENS...\n");

    const allUsers = await User.findAll({
      where: { remember_token: { [Op.not]: null } },
      attributes: ["id", "name", "remember_token", "email"],
    }) as any[];

    let emptyTokens = 0;
    let shortTokens = 0;
    let invalidFormatTokens = 0;

    for (const user of allUsers) {
      const token = user.remember_token;
      if (!token || token.trim().length === 0) {
        emptyTokens++;
      } else if (token.length < 50) {
        shortTokens++;
        console.log(`   ⚠️ Short token (<50 chars): User ${user.id} (${user.name})`);
        console.log(`      Token: ${token}`);
      }

      // Firebase tokens are usually long alphanumeric strings
      if (!/^[a-zA-Z0-9_-]+$/.test(token.trim())) {
        invalidFormatTokens++;
      }
    }

    console.log(`\n📊 Token Analysis Results:`);
    console.log(`   - Total users with tokens: ${allUsers.length}`);
    console.log(`   - Empty tokens: ${emptyTokens}`);
    console.log(`   - Short tokens (<50 chars): ${shortTokens}`);
    console.log(`   - Invalid format tokens: ${invalidFormatTokens}`);

    // 📈 Statistics
    console.log(`\n\n${"=".repeat(80)}`);
    console.log("📈 NOTIFICATION STATISTICS\n");

    const sentCount = await NotificationLog.count({
      where: { status: "SENT" },
    });

    const failedCount = await NotificationLog.count({
      where: { status: "FAILED" },
    });

    const totalCount = await NotificationLog.count();

    console.log(`   Total notifications: ${totalCount}`);
    console.log(`   ✅ Sent: ${sentCount} (${((sentCount / totalCount) * 100).toFixed(2)}%)`);
    console.log(`   ❌ Failed: ${failedCount} (${((failedCount / totalCount) * 100).toFixed(2)}%)`);

    // 🔗 Cross-reference: Find users with failed notifications
    const userIdsWithFailures = new Set(failedNotifications.map(n => n.user_id));
    console.log(`\n\n${"=".repeat(80)}`);
    console.log(`🔗 USERS WITH FAILED NOTIFICATIONS (${userIdsWithFailures.size} total)\n`);

    for (const userId of Array.from(userIdsWithFailures)) {
      const user = await User.findByPk(userId, {
        attributes: ["id", "name", "email", "remember_token", "created_at"],
      }) as any;

      if (user) {
        console.log(`   User ${userId}: ${user.name} (${user.email})`);
        console.log(`      Token: ${user.remember_token?.substring(0, 50)}...`);
        console.log(`      Created: ${user.created_at}`);

        const failureCount = failedNotifications.filter(
          n => n.user_id === userId
        ).length;
        console.log(`      Failed notifications: ${failureCount}`);
      }
    }

    console.log(`\n\n✅ Diagnosis complete!`);
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. Check if token format is valid (usually 152+ characters)`);
    console.log(`   2. Verify Firebase service account credentials`);
    console.log(`   3. Check Firebase quota and rate limits`);
    console.log(`   4. Clear invalid tokens using: npm run clear-invalid-tokens`);
    console.log(`   5. Review console logs for detailed error messages`);

  } catch (err) {
    console.error("❌ Error during diagnosis:", err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

diagnoseFailedNotifications();
