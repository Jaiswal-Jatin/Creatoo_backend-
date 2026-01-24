import { Request, Response } from "express";
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

      const users = await User.findAll({
        attributes: ["id", "name", "remember_token"],
      });

      if (!users.length) {
        return res.status(404).json({
          success: false,
          message: "No users found!",
        });
      }

      const batchSize = 50;
      let totalSent = 0;
      let totalFailed = 0;
      const invalidTokens: string[] = [];

      for (let i = 0; i < users.length; i += batchSize) {
        const batchUsers = users.slice(i, i + batchSize);

        const batchPromises = batchUsers.map(async (user: any) => {
          if (!user.remember_token) return null;

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
            [user.remember_token]
          );

          const status = result.success > 0 ? "SENT" : "FAILED";

          await NotificationLog.create({
            user_id: user.id,
            title: customSubject,
            message: customMessage,
            token: user.remember_token,
            type: "PROMO",
            status,
            error: status === "FAILED" ? JSON.stringify(result.responses) : null,
          });

          // Also save to NewUserNotification for in-app display
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

          totalSent += result.success;
          totalFailed += result.failure;
          invalidTokens.push(...result.invalidTokens);

          return true;
        });

        await Promise.all(batchPromises);
      }

      if (invalidTokens.length) {
        await User.update(
          { remember_token: null },
          { where: { remember_token: invalidTokens } }
        );
      }

      return res.json({
        success: true,
        message: "Notification sent successfully & saved in database!",
        report: {
          totalUsers: users.length,
          sent: totalSent,
          failed: totalFailed,
          invalidTokensRemoved: invalidTokens.length,
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

  // ✅ POST /notification/send-all (PERSONALIZED + SAVE LOGS)
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

      const users = await User.findAll({
        attributes: ["id", "name", "remember_token", "role_id"],
      });

      if (!users.length) {
        return res.status(404).json({
          success: false,
          message: "No users found!",
        });
      }

      const batchSize = 50;
      let totalSent = 0;
      let totalFailed = 0;
      const invalidTokens: string[] = [];

      for (let i = 0; i < users.length; i += batchSize) {
        const batchUsers = users.slice(i, i + batchSize);

const batchPromises = batchUsers.map(async (user: any) => {
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
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const istOffset = 5.5 * 60 * 60 * 1000; // +5:30
          const istDate = new Date(utc + istOffset);

          const yyyy = istDate.getFullYear();
          const mm = String(istDate.getMonth() + 1).padStart(2, '0');
          const dd = String(istDate.getDate()).padStart(2, '0');
          const hh = String(istDate.getHours()).padStart(2, '0');
          const min = String(istDate.getMinutes()).padStart(2, '0');
          const ss = String(istDate.getSeconds()).padStart(2, '0');
          const istTimeString = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

          // Only send push if token exists
          if (user.remember_token) {
            const result = await sendPushNotification(
              {
                title: customSubject,
                description: customMessage,
                data: { type: "CUSTOM" },
              },
              [user.remember_token]
            );

            const status = result.success > 0 ? "SENT" : "FAILED";

            await NotificationLog.create({
              user_id: user.id,
              title: customSubject,
              message: customMessage,
              token: user.remember_token,
              type: "CUSTOM",
              status,
              error: status === "FAILED" ? JSON.stringify(result.responses) : null,
              created_at: istTimeString,
              updated_at: istTimeString
            });

            totalSent += result.success;
            totalFailed += result.failure;
            invalidTokens.push(...result.invalidTokens);
          }

          // ALWAYS save to NewUserNotification for in-app display
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

          return true;
        });

        await Promise.all(batchPromises);
      }

      if (invalidTokens.length) {
        await User.update(
          { remember_token: null },
          { where: { remember_token: invalidTokens } }
        );
      }

      return res.json({
        success: true,
        message: "Notification sent successfully & saved in database!",
        report: {
          totalUsers: users.length,
          sent: totalSent,
          failed: totalFailed,
          invalidTokensRemoved: invalidTokens.length,
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

  // ✅ POST /notification/send-users (PERSONALIZED + SAVE LOGS)
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

      const users = await User.findAll({
        where: { id: user_ids },
        attributes: ["id", "name", "remember_token", "role_id"],
      });

      if (!users.length) {
        return res.status(404).json({
          success: false,
          message: "No users found for given user_ids!",
        });
      }

      const batchSize = 50;
      let totalSent = 0;
      let totalFailed = 0;
      const invalidTokens: string[] = [];

      for (let i = 0; i < users.length; i += batchSize) {
        const batchUsers = users.slice(i, i + batchSize);

const batchPromises = batchUsers.map(async (user: any) => {
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

          // Only send push if token exists
          if (user.remember_token) {
            const result = await sendPushNotification(
              {
                title: customSubject,
                description: customMessage,
                data: { type: "SPECIFIC_USERS" },
              },
              [user.remember_token]
            );

            const status = result.success > 0 ? "SENT" : "FAILED";

            await NotificationLog.create({
              user_id: user.id,
              title: customSubject,
              message: customMessage,
              token: user.remember_token,
              type: "SPECIFIC_USERS",
              status,
              error: status === "FAILED" ? JSON.stringify(result.responses) : null,
            });

            totalSent += result.success;
            totalFailed += result.failure;
            invalidTokens.push(...result.invalidTokens);
          }

          // ALWAYS save to NewUserNotification for in-app display
          await NewUserNotification.create({
            user_id: user.id,
            notification_subject: customSubject,
            notification_text: customMessage,
            is_redeemed: Number(user.role_id) === 3 ? "CreatorView" : "BusinessView",
            business_id: null,
            order_id: null,
          });

          return true;
        });

        await Promise.all(batchPromises);
      }

      if (invalidTokens.length) {
        await User.update(
          { remember_token: null },
          { where: { remember_token: invalidTokens } }
        );
      }

      return res.json({
        success: true,
        message: "Notification sent successfully & saved in database!",
        report: {
          requestedUsers: user_ids.length,
          foundUsers: users.length,
          sent: totalSent,
          failed: totalFailed,
          invalidTokensRemoved: invalidTokens.length,
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
