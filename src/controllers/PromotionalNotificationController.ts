// src/controllers/PromotionalNotificationController.ts
import { Request, Response } from 'express';
import PromotionalNotification from '../models/PromotionalNotification';
import User from '../models/User';
import Order from '../models/Order';

class PromotionalNotificationController {
  // GET /notification/promotional/all  (type = 1)
  async index(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 1 },
        order: [['id', 'DESC']],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /notification/send/:id  – send notification to all users (logic without actual push integration)
  async sendNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const notification = await PromotionalNotification.findByPk(id);
      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: 'Notification not found!' });
      }

      const users = await User.findAll();

      if (!users.length) {
        return res
          .status(404)
          .json({ success: false, message: 'No users found!' });
      }

      const notificationsData: Array<{ title: string; description: string }> = [];
      const tokens: string[] = [];

      for (const user of users as any[]) {
        if (!user.remember_token) continue;

        const customerName = user.name ?? 'Valued Customer';
        let earnedPoints = 0;

        const orderData = await Order.findOne({
          where: { user_id: user.id },
          order: [['created_at', 'DESC']],
        });

        if (orderData && (orderData as any).loyalty_points_earned != null) {
          earnedPoints = (orderData as any).loyalty_points_earned;
        }

        const subjectTemplate = notification.subject;
        const bodyTemplate = notification.promotional_notification_text;

        const customSubject = subjectTemplate
          .replace('[Customer Name]', customerName)
          .replace('[X points]', `${earnedPoints} points`);

        const customMessage = bodyTemplate
          .replace('[Customer Name]', customerName)
          .replace('[X points]', `${earnedPoints} points`);

        notificationsData.push({
          title: customSubject,
          description: customMessage,
        });

        tokens.push(user.remember_token as string);
      }

      // 👉 Here you would call your push service, like:
      // const api = new WebApiController(new InstagramService());
      // await api.sendPushNotificationBulk(notificationsData, tokens);

      console.log(
        `Prepared ${notificationsData.length} notifications for ${tokens.length} tokens`
      );

      return res.json({
        success: true,
        message: 'Notifications processed (hook up push service here).',
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }

  // GET /notification/dynamic/all  (type = 2)
  async dynamicNotification(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 2 },
        order: [['id', 'DESC']],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /notification/festival/all  (type = 3)
  async festivalNotification(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 3 },
        order: [['id', 'DESC']],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /notification/custom/all  (type = 4)
  async customNotification(req: Request, res: Response) {
    try {
      const records = await PromotionalNotification.findAll({
        where: { type: 4 },
        order: [['id', 'DESC']],
      });

      return res.json({ data: records });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ status: false, message: 'Server error' });
    }
  }

  // GET /notification/custom/add  – just a helper info
  async addNotification(_req: Request, res: Response) {
    return res.json({
      status: true,
      message: 'Use POST /api/notification/custom/store to create a notification.',
    });
  }

  // POST /notification/custom/store  – create custom notification (type 4)
  async storeCustomNotification(req: Request, res: Response) {
    try {
      const { subject, promotional_notification_text } = req.body as {
        subject?: string;
        promotional_notification_text?: string;
      };

      if (!subject || !promotional_notification_text) {
        return res.status(400).json({
          status: false,
          message: 'subject and promotional_notification_text are required.',
        });
      }

      const notification = await PromotionalNotification.create({
        subject,
        promotional_notification_text,
        type: 4,
      });

      return res.status(201).json({
        status: true,
        message: 'Custom Notification added successfully!',
        data: notification,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: 'Server error',
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
          message: 'Notification not found.',
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
        message: 'Server error',
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
          message: 'subject and promotional_notification_text are required.',
        });
      }

      const notification = await PromotionalNotification.findByPk(id);
      if (!notification) {
        return res.status(404).json({
          status: false,
          message: 'Notification not found.',
        });
      }

      notification.subject = subject;
      notification.promotional_notification_text = promotional_notification_text;

      await notification.save();

      return res.json({
        status: true,
        message: 'Notification updated successfully!',
        data: notification,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: 'Server error',
      });
    }
  }
}

export default new PromotionalNotificationController();
