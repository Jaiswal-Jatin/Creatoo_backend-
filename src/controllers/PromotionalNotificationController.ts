import { Request, Response } from "express";
import { Op } from "sequelize";
import PromotionalNotification from "../models/PromotionalNotification";
import User from "../models/User";
import Order from "../models/Order";
import NotificationLog from "../models/NotificationLog";
import NewUserNotification from "../models/NewUserNotification";
import { sendPushNotification } from "../services/sendPushNotification";

class PromotionalNotificationController {
  // GET /notification/promotional/all  (type = 1)
  async index(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 1 },
        order: [["id", "DESC"]],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // ✅ GET /notification/send/:id  – send DB notification to all users (PERSONALIZED + SAVE LOGS)
  async sendNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const notification = await PromotionalNotification.findByPk(id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found!",
        });
      }

      let allUsers = await User.findAll({
        where: { remember_token: { [Op.not]: null } },
        attributes: ["id", "name", "remember_token", "role_id"],
      });

      // ✅ CRITICAL FIX: Filter out empty/whitespace tokens
      const validatedUsers = allUsers.filter(u => {
        const token = (u as any).remember_token?.trim();
        return token && token.length > 0;
      });

      const invalidatedTokenCount = allUsers.length - validatedUsers.length;
      if (invalidatedTokenCount > 0) {
        console.log(`⚠️ Filtered out ${invalidatedTokenCount} users with empty/invalid tokens`);
      }

      if (!validatedUsers.length) {
        return res.status(404).json({
          success: false,
          message: `No users with valid FCM tokens found! Total users: ${allUsers.length}, Valid tokens: 0`,
        });
      }

      const batchSize = 50;
      let totalSent = 0;
      let totalFailed = 0;
      const invalidTokens: string[] = [];
      const failedUsers: Array<{ id: number; name: string; error: string }> = [];

      console.log(`📤 Starting to send ${validatedUsers.length} promotional notifications in batches of ${batchSize}`);

      for (let i = 0; i < validatedUsers.length; i += batchSize) {
        const batchUsers = validatedUsers.slice(i, i + batchSize);
        console.log(`⏳ Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validatedUsers.length / batchSize)}`);

        const batchPromises = batchUsers.map(async (user: any) => {
          try {
            // ✅ Validate token format
            const tokenTrimmed = user.remember_token?.trim();
            if (!tokenTrimmed || tokenTrimmed.length === 0) {
              throw new Error("Token is empty or whitespace");
            }

            const customerName = user.name ?? "Valued Customer";
            let earnedPoints = 0;

            const orderData = await Order.findOne({
              where: { user_id: user.id },
              order: [["created_at", "DESC"]],
              attributes: ["loyalty_points_earned"],
            });

            if (orderData && (orderData as any).loyalty_points_earned != null) {
              earnedPoints = (orderData as any).loyalty_points_earned;
            }

            const customSubject = notification.subject
              .replace("[Customer Name]", customerName)
              .replace("[X points]", `${earnedPoints} points`);

            const customMessage = notification.promotional_notification_text
              .replace("[Customer Name]", customerName)
              .replace("[X points]", `${earnedPoints} points`);

            const result = await sendPushNotification(
              {
                title: customSubject,
                description: customMessage,
                data: {
                  type: "PROMO",
                  notification_id: String(notification.id),
                },
              },
              [tokenTrimmed]
            );

            const status = result.success > 0 ? "SENT" : "FAILED";

            // ✅ IMPROVED: Detailed error tracking with diagnostics
            let errorDetails: string | null = null;
            if (status === "FAILED") {
              errorDetails = JSON.stringify({
                failureCount: result.failure,
                responses: result.responses,
                diagnostics: result.diagnostics,
                tokenLength: tokenTrimmed.length,
                tokenStart: tokenTrimmed.substring(0, 20),
              });
              failedUsers.push({
                id: user.id,
                name: user.name,
                error: result.responses[0]?.error?.message || result.diagnostics?.firebaseErrors?.[0] || "Unknown error",
              });
              console.error(`❌ Notification FAILED for user ${user.id} (${user.name})`);
              console.error(`   Token length: ${tokenTrimmed.length} (Firebase tokens should be 152+)`);
              console.error(`   Firebase errors:`, result.diagnostics?.firebaseErrors);
            }

            await NotificationLog.create({
              user_id: user.id,
              title: customSubject,
              message: customMessage,
              token: tokenTrimmed,
              type: "PROMO",
              status,
              error: errorDetails,
            });

            // Also save to NewUserNotification for in-app display
            if (status === "SENT") {
              const isRedeemedValue = Number(user.role_id) === 3 ? "CreatorView" : "BusinessView";
              console.log(`[DEBUG] Saving notification for user ${user.id} (Role: ${user.role_id}): is_redeemed=${isRedeemedValue}`);

              await NewUserNotification.create({
                user_id: user.id,
                notification_subject: customSubject,
                notification_text: customMessage,
                is_redeemed: isRedeemedValue,
                business_id: null,
                order_id: null,
              });
            }

            totalSent += result.success;
            totalFailed += result.failure;
            invalidTokens.push(...result.invalidTokens);

            return true;
          } catch (err: any) {
            console.error(`❌ Error processing user ${(user as any).id}:`, err?.message);
            failedUsers.push({
              id: (user as any).id,
              name: (user as any).name,
              error: err?.message || "Unknown error",
            });
            totalFailed++;
            return false;
          }
        });

        await Promise.all(batchPromises);
      }

      if (invalidTokens.length) {
        console.log(`🗑️ Removing ${invalidTokens.length} invalid tokens from database`);
        await User.update(
          { remember_token: null },
          { where: { remember_token: invalidTokens } }
        );
      }

      const successMessage = totalFailed === 0
        ? "✅ Notification sent successfully to all users!"
        : `⚠️ Notification sent to ${totalSent} users, ${totalFailed} failed`;

      return res.json({
        success: totalFailed <= 5, // Allow small number of failures
        message: successMessage,
        report: {
          totalUsers: validatedUsers.length,
          sent: totalSent,
          failed: totalFailed,
          invalidTokensRemoved: invalidTokens.length,
          emptyTokensFiltered: invalidatedTokenCount,
          failureDetails: failedUsers.length > 0 ? failedUsers : undefined,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  // GET /notification/dynamic/all  (type = 2)
  async dynamicNotification(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 2 },
        order: [["id", "DESC"]],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // GET /notification/festival/all  (type = 3)
  async festivalNotification(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 3 },
        order: [["id", "DESC"]],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // GET /notification/custom/all  (type = 4)
  async customNotification(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 4 },
        order: [["id", "DESC"]],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: "Server error" });
    }
  }

  // GET /notification/custom/add
  async addNotification(_req: Request, res: Response) {
    return res.json({
      status: true,
      message: "Use POST /api/notification/custom/store to create a notification.",
    });
  }

  // POST /notification/custom/store  (type = 4)
  async storeCustomNotification(req: Request, res: Response) {
    try {
      const { subject, promotional_notification_text } = req.body as {
        subject?: string;
        promotional_notification_text?: string;
      };

      if (!subject || !promotional_notification_text) {
        return res.status(400).json({
          status: false,
          message: "subject and promotional_notification_text are required.",
        });
      }

      const notification = await PromotionalNotification.create({
        subject,
        promotional_notification_text,
        type: 4,
      });

      return res.status(201).json({
        status: true,
        message: "Custom Notification added successfully!",
        data: notification,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }

  // GET /notification/custom/edit/:id
  async editNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const notification = await PromotionalNotification.findByPk(id);
      if (!notification) {
        return res.status(404).json({
          status: false,
          message: "Notification not found.",
        });
      }

      return res.json({
        status: true,
        data: notification,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }

  // POST /notification/custom/update/:id
  async updateNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { subject, promotional_notification_text } = req.body as {
        subject?: string;
        promotional_notification_text?: string;
      };

      if (!subject || !promotional_notification_text) {
        return res.status(400).json({
          status: false,
          message: "subject and promotional_notification_text are required.",
        });
      }

      const notification = await PromotionalNotification.findByPk(id);
      if (!notification) {
        return res.status(404).json({
          status: false,
          message: "Notification not found.",
        });
      }

      notification.subject = subject;
      notification.promotional_notification_text = promotional_notification_text;
      await notification.save();

      return res.json({
        status: true,
        message: "Notification updated successfully!",
        data: notification,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }

  // ✅ POST /notification/send-all (PERSONALIZED + SAVE LOGS + DETAILED ERROR TRACKING)
  async sendAllUsers(req: Request, res: Response) {
    try {
      const { subject, message } = req.body as {
        subject?: string;
        message?: string;
      };

      if (!subject || !message) {
        return res.status(400).json({
          success: false,
          message: "subject and message are required.",
        });
      }

      let allUsers = await User.findAll({
        where: { remember_token: { [Op.not]: null } },
        attributes: ["id", "name", "remember_token", "role_id"],
      });

      // ✅ CRITICAL FIX: Filter out empty/whitespace tokens that might fail
      const validatedUsers = allUsers.filter(u => {
        const token = (u as any).remember_token?.trim();
        return token && token.length > 0;
      });

      const invalidatedTokenCount = allUsers.length - validatedUsers.length;
      if (invalidatedTokenCount > 0) {
        console.log(`⚠️ Filtered out ${invalidatedTokenCount} users with empty/invalid tokens`);
      }

      if (!validatedUsers.length) {
        return res.status(200).json({
          success: true,
          message: "No users with valid FCM tokens found. Notifications require valid device tokens.",
          report: {
            totalUsers: 0,
            sent: 0,
            failed: 0,
            invalidTokensRemoved: 0,
            emptyTokensFiltered: invalidatedTokenCount,
            roleBreakdown: {
              businessOwners: 0,
              creators: 0,
              others: 0,
            },
          },
        });
      }

      const batchSize = 50;
      let totalSent = 0;
      let totalFailed = 0;
      const invalidTokens: string[] = [];
      const failedUsers: Array<{ id: number; name: string; error: string }> = [];

      // ✅ Track role breakdown
      const roleBreakdown = {
        businessOwners: 0, // role_id = 2
        creators: 0,        // role_id = 3
        others: 0,          // role_id = 1 (admin) or others
      };

      console.log(`📤 Starting to send ${validatedUsers.length} notifications in batches of ${batchSize}`);

      for (let i = 0; i < validatedUsers.length; i += batchSize) {
        const batchUsers = validatedUsers.slice(i, i + batchSize);
        console.log(`⏳ Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validatedUsers.length / batchSize)}`);

        const batchPromises = batchUsers.map(async (user: any) => {
          try {
            const customerName = user.name ?? "Valued Customer";
            let earnedPoints = 0;

            const orderData = await Order.findOne({
              where: { user_id: user.id },
              order: [["created_at", "DESC"]],
              attributes: ["loyalty_points_earned"],
            });

            if (orderData && (orderData as any).loyalty_points_earned != null) {
              earnedPoints = (orderData as any).loyalty_points_earned;
            }

            const customSubject = subject
              .replace("[Customer Name]", customerName)
              .replace("[X points]", `${earnedPoints} points`);

            const customMessage = message
              .replace("[Customer Name]", customerName)
              .replace("[X points]", `${earnedPoints} points`);

            // Manually calculate IST time and format as String to avoid Timezone conversion
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 30000);
            const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
            const istDate = new Date(utc + istOffset);

            const yyyy = istDate.getFullYear();
            const mm = String(istDate.getMonth() + 1).padStart(2, '0');
            const dd = String(istDate.getDate()).padStart(2, '0');
            const hh = String(istDate.getHours()).padStart(2, '0');
            const min = String(istDate.getMinutes()).padStart(2, '0');
            const ss = String(istDate.getSeconds()).padStart(2, '0');
            const istTimeString = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

            // ✅ Track role breakdown
            if (user.role_id === 2) {
              roleBreakdown.businessOwners++;
            } else if (user.role_id === 3) {
              roleBreakdown.creators++;
            } else {
              roleBreakdown.others++;
            }

            // ✅ Validate token format
            const tokenTrimmed = user.remember_token?.trim();
            if (!tokenTrimmed || tokenTrimmed.length === 0) {
              throw new Error("Token is empty or whitespace");
            }

            const result = await sendPushNotification(
              {
                title: customSubject,
                description: customMessage,
                data: { type: "CUSTOM" },
              },
              [tokenTrimmed]
            );

            const status = result.success > 0 ? "SENT" : "FAILED";

            // ✅ IMPROVED: Detailed error tracking with diagnostics
            let errorDetails: string | null = null;
            if (status === "FAILED") {
              errorDetails = JSON.stringify({
                failureCount: result.failure,
                responses: result.responses,
                diagnostics: result.diagnostics,
                tokenLength: tokenTrimmed.length,
                tokenStart: tokenTrimmed.substring(0, 20),
                timestamp: istTimeString,
              });
              failedUsers.push({
                id: user.id,
                name: user.name,
                error: result.responses[0]?.error?.message || result.diagnostics?.firebaseErrors?.[0] || "Unknown error",
              });
              console.error(`❌ Notification FAILED for user ${user.id} (${user.name})`);
              console.error(`   Token length: ${tokenTrimmed.length} (Firebase tokens should be 152+)`);
              console.error(`   Firebase errors:`, result.diagnostics?.firebaseErrors);
              console.error(`   Detailed response:`, errorDetails);
            }

            await NotificationLog.create({
              user_id: user.id,
              title: customSubject,
              message: customMessage,
              token: tokenTrimmed,
              type: "CUSTOM",
              status,
              error: errorDetails,
              created_at: istTimeString,
              updated_at: istTimeString
            });

            totalSent += result.success;
            totalFailed += result.failure;
            invalidTokens.push(...result.invalidTokens);

            // ✅ ONLY save to NewUserNotification if push was sent successfully
            if (status === "SENT") {
              await NewUserNotification.create({
                user_id: user.id,
                notification_subject: customSubject,
                notification_text: customMessage,
                is_redeemed: Number(user.role_id) === 3 ? "CreatorView" : "BusinessView",
                business_id: null,
                order_id: null,
                created_at: istTimeString,
                updated_at: istTimeString
              });
            }

            return true;
          } catch (err: any) {
            console.error(`❌ Error processing user ${(user as any).id}:`, err?.message);
            failedUsers.push({
              id: (user as any).id,
              name: (user as any).name,
              error: err?.message || "Unknown error",
            });
            totalFailed++;
            return false;
          }
        });

        await Promise.all(batchPromises);
      }

      if (invalidTokens.length) {
        console.log(`🗑️ Removing ${invalidTokens.length} invalid tokens from database`);
        await User.update(
          { remember_token: null },
          { where: { remember_token: invalidTokens } }
        );
      }

      const successMessage = totalFailed === 0
        ? "✅ Notification sent successfully to ALL users!"
        : `⚠️ Notification sent to ${totalSent} users, ${totalFailed} failed`;

      return res.json({
        success: totalFailed <= 5, // Allow small number of failures
        message: successMessage,
        report: {
          totalUsers: validatedUsers.length,
          sent: totalSent,
          failed: totalFailed,
          invalidTokensRemoved: invalidTokens.length,
          emptyTokensFiltered: invalidatedTokenCount,
          failureDetails: failedUsers.length > 0 ? failedUsers : undefined,
          roleBreakdown: {
            businessOwners: roleBreakdown.businessOwners,
            creators: roleBreakdown.creators,
            others: roleBreakdown.others,
          },
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  // ✅ POST /notification/send-users (PERSONALIZED + SAVE LOGS + DETAILED ERROR TRACKING)
  async sendSpecificUsers(req: Request, res: Response) {
    try {
      const { user_ids, subject, message } = req.body as {
        user_ids?: number[];
        subject?: string;
        message?: string;
      };

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "user_ids is required and must be an array.",
        });
      }

      if (!subject || !message) {
        return res.status(400).json({
          success: false,
          message: "subject and message are required.",
        });
      }

      // ✅ CRITICAL FIX: Only fetch users with valid remember_token (FCM token)
      let allUsers = await User.findAll({
        where: {
          id: user_ids,
          remember_token: { [Op.not]: null },
        },
        attributes: ["id", "name", "remember_token", "role_id"],
      });

      // ✅ CRITICAL FIX: Filter out empty/whitespace tokens that might fail
      const validatedUsers = allUsers.filter(u => {
        const token = (u as any).remember_token?.trim();
        return token && token.length > 0;
      });

      const invalidatedTokenCount = allUsers.length - validatedUsers.length;
      if (invalidatedTokenCount > 0) {
        console.log(`⚠️ Filtered out ${invalidatedTokenCount} users with empty/invalid tokens`);
      }

      if (!validatedUsers.length) {
        return res.status(200).json({
          success: true,
          message: `No users with valid FCM tokens found. Requested: ${user_ids.length}, Found with tokens: 0. Notifications require valid device tokens.`,
          report: {
            requestedUsers: user_ids.length,
            foundUsers: 0,
            sent: 0,
            failed: 0,
            invalidTokensRemoved: 0,
            emptyTokensFiltered: invalidatedTokenCount,
          },
        });
      }

      const batchSize = 50;
      let totalSent = 0;
      let totalFailed = 0;
      const invalidTokens: string[] = [];
      const failedUsers: Array<{ id: number; name: string; error: string }> = [];

      // ✅ Track role breakdown
      const roleBreakdown = {
        businessOwners: 0, // role_id = 2
        creators: 0,        // role_id = 3
        others: 0,          // role_id = 1 (admin) or others
      };

      console.log(`📤 Starting to send ${validatedUsers.length} notifications to specific users in batches of ${batchSize}`);

      for (let i = 0; i < validatedUsers.length; i += batchSize) {
        const batchUsers = validatedUsers.slice(i, i + batchSize);
        console.log(`⏳ Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validatedUsers.length / batchSize)}`);

        const batchPromises = batchUsers.map(async (user: any) => {
          try {
            const customerName = user.name ?? "Valued Customer";
            let earnedPoints = 0;

            const orderData = await Order.findOne({
              where: { user_id: user.id },
              order: [["created_at", "DESC"]],
              attributes: ["loyalty_points_earned"],
            });

            if (orderData && (orderData as any).loyalty_points_earned != null) {
              earnedPoints = (orderData as any).loyalty_points_earned;
            }

            const customSubject = subject
              .replace("[Customer Name]", customerName)
              .replace("[X points]", `${earnedPoints} points`);

            const customMessage = message
              .replace("[Customer Name]", customerName)
              .replace("[X points]", `${earnedPoints} points`);

            // Manually calculate IST time
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 30000);
            const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
            const istDate = new Date(utc + istOffset);

            const yyyy = istDate.getFullYear();
            const mm = String(istDate.getMonth() + 1).padStart(2, '0');
            const dd = String(istDate.getDate()).padStart(2, '0');
            const hh = String(istDate.getHours()).padStart(2, '0');
            const min = String(istDate.getMinutes()).padStart(2, '0');
            const ss = String(istDate.getSeconds()).padStart(2, '0');
            const istTimeString = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

            // ✅ Track role breakdown
            if (user.role_id === 2) {
              roleBreakdown.businessOwners++;
            } else if (user.role_id === 3) {
              roleBreakdown.creators++;
            } else {
              roleBreakdown.others++;
            }

            // ✅ Validate token format
            const tokenTrimmed = user.remember_token?.trim();
            if (!tokenTrimmed || tokenTrimmed.length === 0) {
              throw new Error("Token is empty or whitespace");
            }

            const result = await sendPushNotification(
              {
                title: customSubject,
                description: customMessage,
                data: { type: "SPECIFIC_USERS" },
              },
              [tokenTrimmed]
            );

            const status = result.success > 0 ? "SENT" : "FAILED";

            // ✅ IMPROVED: Detailed error tracking with diagnostics
            let errorDetails: string | null = null;
            if (status === "FAILED") {
              errorDetails = JSON.stringify({
                failureCount: result.failure,
                responses: result.responses,
                diagnostics: result.diagnostics,
                tokenLength: tokenTrimmed.length,
                tokenStart: tokenTrimmed.substring(0, 20),
                timestamp: istTimeString,
              });
              failedUsers.push({
                id: user.id,
                name: user.name,
                error: result.responses[0]?.error?.message || result.diagnostics?.firebaseErrors?.[0] || "Unknown error",
              });
              console.error(`❌ Notification FAILED for user ${user.id} (${user.name})`);
              console.error(`   Token length: ${tokenTrimmed.length} (Firebase tokens should be 152+)`);
              console.error(`   Firebase errors:`, result.diagnostics?.firebaseErrors);
            }

            await NotificationLog.create({
              user_id: user.id,
              title: customSubject,
              message: customMessage,
              token: tokenTrimmed,
              type: "SPECIFIC_USERS",
              status,
              error: errorDetails,
              created_at: istTimeString,
              updated_at: istTimeString
            });

            totalSent += result.success;
            totalFailed += result.failure;
            invalidTokens.push(...result.invalidTokens);

            // ✅ ONLY save to NewUserNotification if push was sent successfully
            if (status === "SENT") {
              await NewUserNotification.create({
                user_id: user.id,
                notification_subject: customSubject,
                notification_text: customMessage,
                is_redeemed: Number(user.role_id) === 3 ? "CreatorView" : "BusinessView",
                business_id: null,
                order_id: null,
                created_at: istTimeString,
                updated_at: istTimeString
              });
            }

            return true;
          } catch (err: any) {
            console.error(`❌ Error processing user ${(user as any).id}:`, err?.message);
            failedUsers.push({
              id: (user as any).id,
              name: (user as any).name,
              error: err?.message || "Unknown error",
            });
            totalFailed++;
            return false;
          }
        });

        await Promise.all(batchPromises);
      }

      if (invalidTokens.length) {
        console.log(`🗑️ Removing ${invalidTokens.length} invalid tokens from database`);
        await User.update(
          { remember_token: null },
          { where: { remember_token: invalidTokens } }
        );
      }

      const successMessage = totalFailed === 0
        ? "✅ Notification sent successfully to all specified users!"
        : `⚠️ Notification sent to ${totalSent} users, ${totalFailed} failed`;

      return res.json({
        success: totalFailed <= 5, // Allow small number of failures
        message: successMessage,
        report: {
          requestedUsers: user_ids.length,
          foundUsers: validatedUsers.length,
          sent: totalSent,
          failed: totalFailed,
          invalidTokensRemoved: invalidTokens.length,
          emptyTokensFiltered: invalidatedTokenCount,
          failureDetails: failedUsers.length > 0 ? failedUsers : undefined,
          roleBreakdown: {
            businessOwners: roleBreakdown.businessOwners,
            creators: roleBreakdown.creators,
            others: roleBreakdown.others,
          },
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  // ✅ GET /notification/logs
  async logs(req: Request, res: Response) {
    try {
      const logs = await NotificationLog.findAll({
        order: [["id", "DESC"]],
        limit: 200,
      });

      return res.json({ success: true, data: logs });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // ✅ GET /notification/logs/:user_id
  async logsByUser(req: Request, res: Response) {
    try {
      const { user_id } = req.params;

      const logs = await NotificationLog.findAll({
        where: { user_id },
        order: [["id", "DESC"]],
        limit: 200,
      });

      return res.json({ success: true, data: logs });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default new PromotionalNotificationController();
