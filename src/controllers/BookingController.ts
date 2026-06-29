/**
 * Module: Backend (API Server)
 * File Purpose: Booking Controller - Handles user booking requests and business management.
 * Used By: BookingRoutes (/api/booking/*)
 * Database Models: Booking, User, Business
 * Critical: Yes
 * Updated: 2026-05-28 — Added advance payment order creation & verification
 */
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import crypto from 'crypto';
import axios from 'axios';
import Booking from '../models/Booking';
import User from '../models/User';
import Business from '../models/Business';
import Setting from '../models/Setting';
import WalletTransaction from '../models/WalletTransaction';
import BusinessSettlement from '../models/BusinessSettlement';
import NewUserNotification from '../models/NewUserNotification';
import { sendPushNotification } from '../services/sendPushNotification';

class BookingController {
  // ─────────────────────────────────────────
  // POST /api/booking/create
  // User submits a booking request to a business
  // ─────────────────────────────────────────
  async createRequest(req: Request, res: Response) {
    try {
      const jwtUser = (req as any).user;
      const userId = jwtUser?.id;

      const {
        business_id,
        booking_date,
        booking_time,
        guests_count,
        service_name,
        sport_name,
        notes,
      } = req.body;

      // ─── Validation ───
      if (!business_id || !booking_date || !booking_time) {
        return res.status(422).json({
          status: false,
          message: 'business_id, booking_date, and booking_time are required.',
        });
      }

      // ─── Fetch business to get category ───
      const business = await Business.findByPk(Number(business_id));
      if (!business) {
        return res.status(404).json({ status: false, message: 'Business not found.' });
      }

      const category = business.business_category;
      if (!category) {
        return res.status(422).json({ status: false, message: 'Business has no category set.' });
      }

      // ─── Category-specific validation ───
      if ((category === 'restaurant' || category === 'turf') && !guests_count) {
        return res.status(422).json({
          status: false,
          message: `guests_count is required for ${category} booking.`,
        });
      }
      if (category === 'salon' && !service_name) {
        return res.status(422).json({
          status: false,
          message: 'service_name is required for salon booking.',
        });
      }

      // ─── Fetch requesting user ───
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ status: false, message: 'User not found.' });
      }

      // ─── Create booking ───
      const booking = await Booking.create({
        user_id: userId,
        business_id: Number(business_id),
        business_category: category,
        booking_date: String(booking_date),
        booking_time: String(booking_time),
        guests_count: guests_count ? Number(guests_count) : null,
        service_name: service_name || null,
        sport_name: sport_name || null,
        notes: notes || null,
        status: 'pending',
        rejection_reason: null,
        reminder_sent: false,
      });

      // ─── Notify Business via FCM ───
      if (business.remember_token) {
        const categoryEmoji = category === 'restaurant' ? '🍽️' : category === 'salon' ? '💇' : '⚽';
        const detail = category === 'restaurant'
          ? `Table for ${guests_count} guests`
          : category === 'salon'
          ? `Service: ${service_name}`
          : `Sport: ${sport_name || 'N/A'} | Players: ${guests_count}`;

        await sendPushNotification(
          {
            title: `${categoryEmoji} New Booking Request!`,
            description: `${user.name || 'A user'} wants to book on ${booking_date} at ${booking_time}. ${detail}`,
            data: {
              type: 'booking_request',
              booking_id: String(booking.id),
              screen: 'businessBookingsView',
            },
          },
          [business.remember_token]
        );
      }

      // ─── Save notification in DB for user ───
      await NewUserNotification.create({
        user_id: userId,
        business_id: Number(business_id),
        order_id: null,
        notification_subject: 'Booking Request Sent!',
        notification_text: `Your booking request to ${business.business_name || 'the business'} on ${booking_date} at ${booking_time} has been sent. Waiting for confirmation.`,
        is_redeemed: "0",
      });

      // ─── Save notification in DB for business owner ───
      await NewUserNotification.create({
        user_id: Number(business_id),
        business_id: Number(business_id),
        order_id: null,
        notification_subject: 'New Booking Request!',
        notification_text: `${user.name || 'A customer'} wants to book on ${booking_date} at ${booking_time}.`,
        is_redeemed: 'BusinessView',
      });

      return res.status(200).json({
        status: true,
        message: 'Booking request sent successfully!',
        data: booking,
      });
    } catch (err: any) {
      console.error('createRequest error:', err);
      return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
    }
  }

  // ─────────────────────────────────────────
  // GET /api/booking/user-history
  // User retrieves all their booking requests
  // ─────────────────────────────────────────
  async getUserHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      const bookings = await Booking.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
      });

      // Fetch business details for all bookings
      const businessIds = [...new Set(bookings.map(b => b.business_id))];
      const businesses = await Business.findAll({
        where: { id: { [Op.in]: businessIds } },
        attributes: ['id', 'business_name', 'business_image', 'business_category', 'time_from', 'time_to'],
      });
      const businessMap: Record<number, any> = {};
      businesses.forEach(b => { businessMap[b.id] = b; });

      const data = bookings.map(b => ({
        id: b.id,
        business_id: b.business_id,
        business_category: b.business_category,
        booking_date: b.booking_date,
        booking_time: b.booking_time,
        guests_count: b.guests_count,
        service_name: b.service_name,
        sport_name: b.sport_name,
        notes: b.notes,
        status: b.status,
        rejection_reason: b.rejection_reason,
        created_at: b.created_at,
        // ─── Advance payment data ───
        advance_amount: b.advance_amount,
        advance_payment_status: b.advance_payment_status,
        razorpay_order_id: b.razorpay_order_id,
        is_booking_active: b.is_booking_active,
        advance_payment_at: b.advance_payment_at,
        business: businessMap[b.business_id] ?? null,
      }));

      return res.status(200).json({ status: true, message: 'Bookings fetched.', data });
    } catch (err: any) {
      console.error('getUserHistory error:', err);
      return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
    }
  }

  // ─────────────────────────────────────────
  // GET /api/booking/business-list
  // Business retrieves incoming booking requests
  // ─────────────────────────────────────────
  async getBusinessList(req: Request, res: Response) {
    try {
      const businessId = (req as any).user?.id;

      const bookings = await Booking.findAll({
        where: { business_id: businessId },
        order: [['created_at', 'DESC']],
      });

      // Fetch user details for all bookings
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'name', 'mobile', 'user_image'],
      });
      const userMap: Record<number, any> = {};
      users.forEach(u => { userMap[u.id] = u; });

      const data = bookings.map(b => ({
        id: b.id,
        user_id: b.user_id,
        business_category: b.business_category,
        booking_date: b.booking_date,
        booking_time: b.booking_time,
        guests_count: b.guests_count,
        service_name: b.service_name,
        sport_name: b.sport_name,
        notes: b.notes,
        status: b.status,
        rejection_reason: b.rejection_reason,
        created_at: b.created_at,
        // ─── Advance payment data ───
        advance_amount: b.advance_amount,
        advance_payment_status: b.advance_payment_status,
        is_booking_active: b.is_booking_active,
        user: userMap[b.user_id] ?? null,
      }));

      return res.status(200).json({ status: true, message: 'Bookings fetched.', data });
    } catch (err: any) {
      console.error('getBusinessList error:', err);
      return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
    }
  }

  // ─────────────────────────────────────────
  // POST /api/booking/update-status
  // Business accepts or rejects a booking request
  // Body: { booking_id, status, rejection_reason?, advance_amount? }
  // ─────────────────────────────────────────
  async updateStatus(req: Request, res: Response) {
    try {
      const businessId = (req as any).user?.id;
      const { booking_id, status, rejection_reason, advance_amount } = req.body;

      if (!booking_id || !status) {
        return res.status(422).json({ status: false, message: 'booking_id and status are required.' });
      }
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(422).json({ status: false, message: 'status must be accepted or rejected.' });
      }
      if (status === 'rejected' && !rejection_reason) {
        return res.status(422).json({ status: false, message: 'rejection_reason is required when rejecting.' });
      }

      const booking = await Booking.findOne({ where: { id: Number(booking_id), business_id: businessId } });
      if (!booking) {
        return res.status(404).json({ status: false, message: 'Booking not found or unauthorized.' });
      }

      // ─── Determine if advance is requested ───
      const hasAdvance = status === 'accepted' && advance_amount && Number(advance_amount) > 0;

      const updateData: any = {
        // If advance required: keep status 'pending' until user pays; otherwise set to 'accepted'
        status: hasAdvance ? 'pending' : status,
        rejection_reason: status === 'rejected' ? (rejection_reason || null) : null,
      };

      if (hasAdvance) {
        // Business requested advance: booking stays PENDING until user pays
        updateData.advance_amount = Number(advance_amount);
        updateData.advance_payment_status = 'pending';
        updateData.is_booking_active = false;
      } else if (status === 'accepted') {
        // No advance: booking is immediately active
        updateData.advance_payment_status = 'none';
        updateData.is_booking_active = true;
      }

      await booking.update(updateData);

      // ─── Notify User via FCM and DB ───
      const user = await User.findByPk(booking.user_id, { attributes: ['id', 'name', 'remember_token'] });
      const business = await Business.findByPk(businessId, { attributes: ['id', 'business_name'] });

      let title: string;
      let body: string;

      if (hasAdvance) {
        // Booking stays PENDING — user must pay advance to confirm
        title = `💳 Advance Payment Required`;
        body = `${business?.business_name || 'The business'} is ready to accept your booking for ${booking.booking_date} at ${booking.booking_time}. Please pay an advance of ₹${Number(advance_amount).toFixed(0)} to confirm your booking.`;
      } else if (status === 'accepted') {
        title = `✅ Booking Confirmed!`;
        body = `Great news! ${business?.business_name || 'The business'} has confirmed your booking for ${booking.booking_date} at ${booking.booking_time}.`;
      } else {
        title = `❌ Booking Rejected`;
        body = `Your booking request for ${booking.booking_date} at ${booking.booking_time} was rejected. Reason: ${rejection_reason}`;
      }

      // ─── Save notification in DB for user ───
      await NewUserNotification.create({
        user_id: booking.user_id,
        business_id: businessId,
        order_id: null,
        notification_subject: title,
        notification_text: body,
        is_redeemed: "0",
      });

      // ─── Save notification in DB for business owner ───
      await NewUserNotification.create({
        user_id: businessId,
        business_id: businessId,
        order_id: null,
        notification_subject: hasAdvance
          ? '💳 Advance Payment Requested'
          : status === 'accepted'
          ? '✅ Booking Confirmed'
          : '❌ Booking Rejected',
        notification_text: hasAdvance
          ? `You requested an advance of ₹${Number(advance_amount).toFixed(0)} from ${user?.name || 'the customer'} for the booking on ${booking.booking_date} at ${booking.booking_time}. Booking will confirm once the customer pays.`
          : `You have successfully ${status === 'accepted' ? 'confirmed' : 'rejected'} the booking request from ${user?.name || 'the customer'} for ${booking.booking_date} at ${booking.booking_time}.`,
        is_redeemed: 'BusinessView',
      });

      if (user?.remember_token) {
        await sendPushNotification(
          {
            title,
            description: body,
            data: {
              type: hasAdvance ? 'booking_advance_required' : 'booking_update',
              booking_id: String(booking.id),
              new_status: status,
              advance_amount: hasAdvance ? String(advance_amount) : '0',
              screen: 'bookingHistoryView',
            },
          },
          [user.remember_token]
        );
      }

      return res.status(200).json({
        status: true,
        message: hasAdvance
          ? 'Advance payment requested. Booking will auto-confirm once user pays.'
          : `Booking ${status} successfully.`,
        data: booking,
      });
    } catch (err: any) {
      console.error('updateStatus error:', err);
      return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
    }
  }

  // ─────────────────────────────────────────
  // POST /api/booking/cancel
  // User cancels their own booking request
  // ─────────────────────────────────────────
  async cancelBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { booking_id, reason } = req.body;

      if (!booking_id || !reason) {
        return res.status(422).json({ status: false, message: 'booking_id and reason are required.' });
      }

      const booking = await Booking.findOne({ where: { id: Number(booking_id), user_id: userId } });
      if (!booking) {
        return res.status(404).json({ status: false, message: 'Booking not found or unauthorized.' });
      }

      if (booking.status === 'cancelled') {
        return res.status(422).json({ status: false, message: 'Booking is already cancelled.' });
      }

      await booking.update({
        status: 'cancelled',
        rejection_reason: reason,
      } as any);

      // ─── Fetch Business & User Details for Notification ───
      const business = await Business.findByPk(booking.business_id);
      const user = await User.findByPk(userId);

      const title = `❌ Booking Cancelled by Customer`;
      const body = `Booking for ${booking.booking_date} at ${booking.booking_time} was cancelled by ${user?.name || 'the user'}. Reason: ${reason}`;

      // ─── Save notification in DB for business owner ───
      await NewUserNotification.create({
        user_id: booking.business_id,
        business_id: booking.business_id,
        order_id: null,
        notification_subject: title,
        notification_text: body,
        is_redeemed: 'BusinessView',
      });

      // ─── Save notification in DB for user ───
      await NewUserNotification.create({
        user_id: userId,
        business_id: booking.business_id,
        order_id: null,
        notification_subject: '❌ Booking Cancelled',
        notification_text: `You have successfully cancelled your booking to ${business?.business_name || 'the business'} for ${booking.booking_date} at ${booking.booking_time}.`,
        is_redeemed: "0",
      });

      // ─── Notify Business via FCM ───
      if (business?.remember_token) {
        await sendPushNotification(
          {
            title,
            description: body,
            data: {
              type: 'booking_cancelled',
              booking_id: String(booking.id),
              screen: 'businessBookingsView',
            },
          },
          [business.remember_token]
        );
      }

      return res.status(200).json({
        status: true,
        message: 'Booking cancelled successfully.',
        data: booking,
      });
    } catch (err: any) {
      console.error('cancelBooking error:', err);
      return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
    }
  }

  // ─────────────────────────────────────────
  // POST /api/booking/create-advance-order
  // User creates a Razorpay order to pay advance for a booking
  // Body: { booking_id }
  // ─────────────────────────────────────────
  async createAdvancePaymentOrder(req: Request, res: Response) {
    let userId: number | undefined;
    let booking_id: number | undefined;
    try {
      userId = (req as any).user?.id;
      booking_id = req.body.booking_id;

      if (!booking_id) {
        return res.status(422).json({ status: false, message: 'booking_id is required.' });
      }

      const booking = await Booking.findOne({
        where: { id: Number(booking_id), user_id: userId },
      });
      if (!booking) {
        return res.status(404).json({ status: false, message: 'Booking not found or unauthorized.' });
      }
      if (booking.advance_payment_status !== 'pending') {
        return res.status(400).json({
          status: false,
          message: 'No advance payment pending for this booking.',
        });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(500).json({ status: false, message: 'Razorpay keys not configured.' });
      }

      // ─── Fetch advance payment settings (platform fee & GST %) ───
      const setting = await Setting.findByPk(1);
      let platformFee = 0;
      let gstPercent = 0;
      let gstOnPlatformFee = 0;
      if (setting?.advance_platform_fee_active) {
        platformFee = Number(setting.advance_platform_fee ?? 0);
        if (setting?.advance_gst_active) {
          gstPercent = Number(setting.advance_gst_percent ?? 0);
          gstOnPlatformFee = Math.round(platformFee * (gstPercent / 100) * 100) / 100;
        }
      }
      const advanceBase = Number(booking.advance_amount);
      const totalAmount = advanceBase + platformFee + gstOnPlatformFee;
      const amountInPaise = Math.round(totalAmount * 100);

      console.log('═══════ createAdvancePaymentOrder DEBUG ═══════');
      console.log('Booking advance_amount:', booking.advance_amount);
      console.log('advanceBase:', advanceBase);
      console.log('platformFee:', platformFee);
      console.log('gstPercent:', gstPercent);
      console.log('gstOnPlatformFee:', gstOnPlatformFee);
      console.log('totalAmount:', totalAmount);
      console.log('amountInPaise:', amountInPaise);
      console.log('Razorpay keyId exists:', !!keyId);
      console.log('═══════════════════════════════════════════════');

      // ─── Create Razorpay Order ───
      const razorpayResp = await axios.post(
        'https://api.razorpay.com/v1/orders',
        {
          amount: amountInPaise,
          currency: 'INR',
          receipt: `booking_adv_${booking.id}_${Date.now()}`,
          notes: {
            booking_id: String(booking.id),
            user_id: String(userId),
            type: 'booking_advance',
          },
        },
        {
          auth: { username: keyId, password: keySecret },
          timeout: 15000,
        }
      );

      const order = razorpayResp.data;

      // ─── Store Razorpay order ID in booking ───
      await booking.update({ razorpay_order_id: order.id } as any);

      return res.status(200).json({
        status: true,
        message: 'Razorpay order created. Complete payment.',
        data: {
          razorpay_order_id: order.id,
          amount: totalAmount,
          amount_in_paise: amountInPaise,
          advance_base: advanceBase,
          gst: gstOnPlatformFee,
          gst_percent: gstPercent,
          platform_fee: platformFee,
          key_id: keyId,
          booking_id: booking.id,
        },
      });
    } catch (err: any) {
      console.error('═══════ createAdvancePaymentOrder ERROR ═══════');
      console.error('Booking ID:', booking_id);
      console.error('User ID:', userId);
      console.error('Error name:', err?.name || 'N/A');
      console.error('Error message:', err?.message || err);
      if (err?.response) {
        console.error('Axios response data:', JSON.stringify(err.response.data, null, 2));
        console.error('Axios response status:', err.response.status);
      }
      if (err?.config) {
        console.error('Axios request URL:', err.config.url);
        console.error('Axios request method:', err.config.method);
      }
      console.error('Full error:', err);
      console.error('═══════════════════════════════════════════════════');
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      const clientMessage = isTimeout
        ? 'Payment gateway is not responding. Please try again.'
        : err?.response?.data?.message
          || err?.message
          || 'Something went wrong! Please try again.';
      return res.status(isTimeout ? 504 : 500).json({ status: false, message: clientMessage });
    }
  }

  // ─────────────────────────────────────────
  // POST /api/booking/verify-advance-payment
  // User verifies Razorpay payment for booking advance
  // Body: { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }
  // ─────────────────────────────────────────
  async verifyAdvancePayment(req: Request, res: Response) {
    let userId: number | undefined;
    let booking_id: number | undefined;
    let razorpay_order_id: string | undefined;
    let razorpay_payment_id: string | undefined;
    let razorpay_signature: string | undefined;
    try {
      userId = (req as any).user?.id;
      ({
        booking_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body);

      if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(422).json({
          status: false,
          message: 'booking_id, razorpay_order_id, razorpay_payment_id and razorpay_signature are required.',
        });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
      if (!keySecret) {
        return res.status(500).json({ status: false, message: 'Razorpay secret not configured.' });
      }

      // ─── Verify Signature ───
      const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ status: false, message: 'Invalid Razorpay signature.' });
      }

      const booking = await Booking.findOne({
        where: { id: Number(booking_id), user_id: userId },
      });
      if (!booking) {
        return res.status(404).json({ status: false, message: 'Booking not found.' });
      }

      // ─── Mark advance as paid, auto-confirm booking ───
      await booking.update({
        status: 'accepted',              // Auto-confirm once advance is verified
        advance_payment_status: 'paid',
        razorpay_payment_id,
        advance_payment_at: new Date(),
        is_booking_active: true,
      } as any);

      // ─── Create WalletTransaction for business (advance payment credit) ───
      try {
        await WalletTransaction.create({
          user_id: booking.business_id,
          from_user_id: userId,
          amount: Number(booking.advance_amount) || 0,
          credit_debit: 'credit',
          remark: `Advance payment for booking #${booking.id} from user #${userId}`,
          via: 'advance_payment',
          source_type: 'advance_payment',
          settlement_status: 'pending',
        });
      } catch (wtErr) {
        console.error('Failed to create wallet transaction for advance payment:', wtErr);
      }

      // ─── Add to business settlement (booking type) ───
      try {
        const advanceAmt = Number(booking.advance_amount) || 0;
        if (advanceAmt > 0) {
          const [rec] = await BusinessSettlement.findOrCreate({
            where: { business_id: booking.business_id, type: 'booking' },
            defaults: { business_id: booking.business_id, type: 'booking', total_amount: 0, settled_amount: 0, pending_amount: 0 },
          });
          const amt = Math.round(advanceAmt * 100) / 100;
          rec.total_amount = Math.round((Number(rec.total_amount) + amt) * 100) / 100;
          rec.pending_amount = Math.round((Number(rec.pending_amount) + amt) * 100) / 100;
          await rec.save();
        }
      } catch (settleErr) {
        console.error('Failed to add to booking settlement:', settleErr);
      }

      // ─── Notify Business ───
      const business = await Business.findByPk(booking.business_id, {
        attributes: ['id', 'business_name', 'remember_token'],
      });
      const user = await User.findByPk(userId, { attributes: ['id', 'name', 'remember_token'] });

      if (business?.remember_token) {
        const title = `💰 Advance Payment Received!`;
        const body = `${user?.name || 'The customer'} has paid the advance of ₹${Number(booking.advance_amount).toFixed(0)} for the booking on ${booking.booking_date} at ${booking.booking_time}. Booking is now confirmed!`;

        await sendPushNotification(
          {
            title,
            description: body,
            data: {
              type: 'booking_advance_paid',
              booking_id: String(booking.id),
              screen: 'businessBookingsView',
            },
          },
          [business.remember_token]
        );

        await NewUserNotification.create({
          user_id: booking.business_id,
          business_id: booking.business_id,
          order_id: null,
          notification_subject: title,
          notification_text: body,
          is_redeemed: 'BusinessView',
        });
      }

      // ─── Notify User ───
      if (user?.remember_token) {
        const title = `🎉 Booking Confirmed!`;
        const body = `Your advance payment of ₹${Number(booking.advance_amount).toFixed(0)} has been received by ${business?.business_name || 'the business'}. Your booking for ${booking.booking_date} at ${booking.booking_time} is now fully confirmed!`;

        await sendPushNotification(
          { title, description: body, data: { type: 'booking_active', booking_id: String(booking.id), screen: 'bookingHistoryView' } },
          [user.remember_token]
        );

        await NewUserNotification.create({
          user_id: userId!,
          business_id: booking.business_id,
          order_id: null,
          notification_subject: title,
          notification_text: body,
          is_redeemed: '0',
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Advance payment verified and booking is now active!',
        data: booking,
      });
    } catch (err: any) {
      console.error('═══════ verifyAdvancePayment ERROR ═══════');
      console.error('Booking ID:', booking_id);
      console.error('User ID:', userId);
      console.error('Razorpay Order ID:', razorpay_order_id);
      console.error('Error message:', err?.message || err);
      console.error('Full error:', err);
      console.error('═══════════════════════════════════════════');
      return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
    }
  }
}

export default new BookingController();
