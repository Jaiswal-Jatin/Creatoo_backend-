/**
 * 🧹 CLEANUP SCRIPT: Remove Invalid/Empty FCM Tokens
 * 
 * Usage: npm run ts-node clear-invalid-tokens.ts
 * 
 * This script removes tokens that are:
 * - Empty or whitespace only
 * - Too short (< 50 characters)
 * - Invalid format
 */

import sequelize from "./src/db/sequelize";
import User from "./src/models/User";
import { Op } from "sequelize";

async function clearInvalidTokens() {
  try {
    console.log("🧹 Starting cleanup of invalid FCM tokens...\n");

    const allUsers = await User.findAll({
      where: { remember_token: { [Op.not]: null } },
      attributes: ["id", "name", "remember_token"],
    }) as any[];

    const usersToUpdate: number[] = [];
    const issues: string[] = [];

    for (const user of allUsers) {
      const token = user.remember_token;
      let isInvalid = false;

      // Check 1: Empty or whitespace only
      if (!token || token.trim().length === 0) {
        isInvalid = true;
        issues.push(`User ${user.id}: Empty token`);
      }

      // Check 2: Too short (Firebase tokens should be 152+ characters)
      if (token && token.trim().length < 100) {  // Using 100 as conservative threshold
        isInvalid = true;
        issues.push(`User ${user.id}: Token too short (${token.length} chars - should be 152+)`);
      }

      // Check 3: Invalid characters (Firebase tokens are alphanumeric + _ -)
      if (!/^[a-zA-Z0-9_:-]+$/.test(token.trim())) {
        isInvalid = true;
        issues.push(`User ${user.id}: Invalid token format`);
      }

      if (isInvalid) {
        usersToUpdate.push(user.id);
      }
    }

    console.log(`📊 Analysis Results:`);
    console.log(`   Total users with tokens: ${allUsers.length}`);
    console.log(`   Invalid tokens found: ${usersToUpdate.length}`);
    console.log(`\n`);

    if (issues.length > 0) {
      console.log(`❌ Issues Found:\n`);
      issues.slice(0, 20).forEach(issue => console.log(`   ${issue}`));
      if (issues.length > 20) {
        console.log(`   ... and ${issues.length - 20} more issues`);
      }
    }

    if (usersToUpdate.length === 0) {
      console.log("✅ No invalid tokens found!");
      return;
    }

    // Clear invalid tokens
    console.log(`\n🗑️ Clearing ${usersToUpdate.length} invalid tokens...\n`);

    const result = await User.update(
      { remember_token: null },
      { where: { id: usersToUpdate } }
    );

    console.log(`✅ Updated ${result[0]} user records`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Users will receive new FCM tokens on their next app launch`);
    console.log(`   2. Valid tokens will be used for next notification broadcast`);
    console.log(`   3. Run diagnostic again to verify: npm run ts-node diagnose-failed-notifications.ts`);

  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

clearInvalidTokens();
