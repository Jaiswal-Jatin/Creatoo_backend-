"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const Booking_1 = __importDefault(require("../models/Booking"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const Setting_1 = __importDefault(require("../models/Setting"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const NewUserNotification_1 = __importDefault(require("../models/NewUserNotification"));
const sendPushNotification_1 = require("../services/sendPushNotification");
class BookingController {
    // ─────────────────────────────────────────
    // POST /api/booking/create
    // User submits a booking request to a business
    // ─────────────────────────────────────────
    async createRequest(req, res) {
        try {
            const jwtUser = req.user;
            const userId = jwtUser?.id;
            const { business_id, booking_date, booking_time, guests_count, service_name, sport_name, notes, } = req.body;
            // ─── Validation ───
            if (!business_id || !booking_date || !booking_time) {
                return res.status(422).json({
                    status: false,
                    message: 'business_id, booking_date, and booking_time are required.',
                });
            }
            // ─── Fetch business to get category ───
            const business = await Business_1.default.findByPk(Number(business_id));
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
            const user = await User_1.default.findByPk(userId);
            if (!user) {
                return res.status(404).json({ status: false, message: 'User not found.' });
            }
            // ─── Create booking ───
            const booking = await Booking_1.default.create({
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
                await (0, sendPushNotification_1.sendPushNotification)({
                    title: `${categoryEmoji} New Booking Request!`,
                    description: `${user.name || 'A user'} wants to book on ${booking_date} at ${booking_time}. ${detail}`,
                    data: {
                        type: 'booking_request',
                        booking_id: String(booking.id),
                        screen: 'businessBookingsView',
                    },
                }, [business.remember_token]);
            }
            // ─── Save notification in DB for user ───
            await NewUserNotification_1.default.create({
                user_id: userId,
                business_id: Number(business_id),
                order_id: null,
                notification_subject: 'Booking Request Sent!',
                notification_text: `Your booking request to ${business.business_name || 'the business'} on ${booking_date} at ${booking_time} has been sent. Waiting for confirmation.`,
                is_redeemed: "0",
            });
            // ─── Save notification in DB for business owner ───
            await NewUserNotification_1.default.create({
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
        }
        catch (err) {
            console.error('createRequest error:', err);
            return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
        }
    }
    // ─────────────────────────────────────────
    // GET /api/booking/user-history
    // User retrieves all their booking requests
    // ─────────────────────────────────────────
    async getUserHistory(req, res) {
        try {
            const userId = req.user?.id;
            const bookings = await Booking_1.default.findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']],
            });
            // Fetch business details for all bookings
            const businessIds = [...new Set(bookings.map(b => b.business_id))];
            const businesses = await Business_1.default.findAll({
                where: { id: { [sequelize_1.Op.in]: businessIds } },
                attributes: ['id', 'business_name', 'business_image', 'business_category', 'time_from', 'time_to'],
            });
            const businessMap = {};
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
        }
        catch (err) {
            console.error('getUserHistory error:', err);
            return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
        }
    }
    // ─────────────────────────────────────────
    // GET /api/booking/business-list
    // Business retrieves incoming booking requests
    // ─────────────────────────────────────────
    async getBusinessList(req, res) {
        try {
            const businessId = req.user?.id;
            const bookings = await Booking_1.default.findAll({
                where: { business_id: businessId },
                order: [['created_at', 'DESC']],
            });
            // Fetch user details for all bookings
            const userIds = [...new Set(bookings.map(b => b.user_id))];
            const users = await User_1.default.findAll({
                where: { id: { [sequelize_1.Op.in]: userIds } },
                attributes: ['id', 'name', 'mobile', 'user_image'],
            });
            const userMap = {};
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
        }
        catch (err) {
            console.error('getBusinessList error:', err);
            return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
        }
    }
    // ─────────────────────────────────────────
    // POST /api/booking/update-status
    // Business accepts or rejects a booking request
    // Body: { booking_id, status, rejection_reason?, advance_amount? }
    // ─────────────────────────────────────────
    async updateStatus(req, res) {
        try {
            const businessId = req.user?.id;
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
            const booking = await Booking_1.default.findOne({ where: { id: Number(booking_id), business_id: businessId } });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found or unauthorized.' });
            }
            // ─── Determine if advance is requested ───
            const hasAdvance = status === 'accepted' && advance_amount && Number(advance_amount) > 0;
            const updateData = {
                // If advance required: keep status 'pending' until user pays; otherwise set to 'accepted'
                status: hasAdvance ? 'pending' : status,
                rejection_reason: status === 'rejected' ? (rejection_reason || null) : null,
            };
            if (hasAdvance) {
                // Business requested advance: booking stays PENDING until user pays
                updateData.advance_amount = Number(advance_amount);
                updateData.advance_payment_status = 'pending';
                updateData.is_booking_active = false;
            }
            else if (status === 'accepted') {
                // No advance: booking is immediately active
                updateData.advance_payment_status = 'none';
                updateData.is_booking_active = true;
            }
            await booking.update(updateData);
            // ─── Notify User via FCM ───
            const user = await User_1.default.findByPk(booking.user_id, { attributes: ['id', 'name', 'remember_token'] });
            const business = await Business_1.default.findByPk(businessId, { attributes: ['id', 'business_name'] });
            if (user?.remember_token) {
                let title;
                let body;
                if (hasAdvance) {
                    // Booking stays PENDING — user must pay advance to confirm
                    title = `💳 Advance Payment Required`;
                    body = `${business?.business_name || 'The business'} is ready to accept your booking for ${booking.booking_date} at ${booking.booking_time}. Please pay an advance of ₹${Number(advance_amount).toFixed(0)} to confirm your booking.`;
                }
                else if (status === 'accepted') {
                    title = `✅ Booking Confirmed!`;
                    body = `Great news! ${business?.business_name || 'The business'} has confirmed your booking for ${booking.booking_date} at ${booking.booking_time}.`;
                }
                else {
                    title = `❌ Booking Rejected`;
                    body = `Your booking request for ${booking.booking_date} at ${booking.booking_time} was rejected. Reason: ${rejection_reason}`;
                }
                await (0, sendPushNotification_1.sendPushNotification)({
                    title,
                    description: body,
                    data: {
                        type: hasAdvance ? 'booking_advance_required' : 'booking_update',
                        booking_id: String(booking.id),
                        new_status: status,
                        advance_amount: hasAdvance ? String(advance_amount) : '0',
                        screen: 'bookingHistoryView',
                    },
                }, [user.remember_token]);
                // ─── Save notification in DB for user ───
                await NewUserNotification_1.default.create({
                    user_id: booking.user_id,
                    business_id: businessId,
                    order_id: null,
                    notification_subject: title,
                    notification_text: body,
                    is_redeemed: "0",
                });
                // ─── Save notification in DB for business owner ───
                await NewUserNotification_1.default.create({
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
            }
            return res.status(200).json({
                status: true,
                message: hasAdvance
                    ? 'Advance payment requested. Booking will auto-confirm once user pays.'
                    : `Booking ${status} successfully.`,
                data: booking,
            });
        }
        catch (err) {
            console.error('updateStatus error:', err);
            return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
        }
    }
    // ─────────────────────────────────────────
    // POST /api/booking/cancel
    // User cancels their own booking request
    // ─────────────────────────────────────────
    async cancelBooking(req, res) {
        try {
            const userId = req.user?.id;
            const { booking_id, reason } = req.body;
            if (!booking_id || !reason) {
                return res.status(422).json({ status: false, message: 'booking_id and reason are required.' });
            }
            const booking = await Booking_1.default.findOne({ where: { id: Number(booking_id), user_id: userId } });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found or unauthorized.' });
            }
            if (booking.status === 'cancelled') {
                return res.status(422).json({ status: false, message: 'Booking is already cancelled.' });
            }
            await booking.update({
                status: 'cancelled',
                rejection_reason: reason,
            });
            // ─── Fetch Business & User Details for Notification ───
            const business = await Business_1.default.findByPk(booking.business_id);
            const user = await User_1.default.findByPk(userId);
            // ─── Notify Business via FCM ───
            if (business?.remember_token) {
                const title = `❌ Booking Cancelled by Customer`;
                const body = `Booking for ${booking.booking_date} at ${booking.booking_time} was cancelled by ${user?.name || 'the user'}. Reason: ${reason}`;
                await (0, sendPushNotification_1.sendPushNotification)({
                    title,
                    description: body,
                    data: {
                        type: 'booking_cancelled',
                        booking_id: String(booking.id),
                        screen: 'businessBookingsView',
                    },
                }, [business.remember_token]);
                // ─── Save notification in DB for business owner ───
                await NewUserNotification_1.default.create({
                    user_id: booking.business_id,
                    business_id: booking.business_id,
                    order_id: null,
                    notification_subject: title,
                    notification_text: body,
                    is_redeemed: 'BusinessView',
                });
            }
            // ─── Save notification in DB for user ───
            await NewUserNotification_1.default.create({
                user_id: userId,
                business_id: booking.business_id,
                order_id: null,
                notification_subject: '❌ Booking Cancelled',
                notification_text: `You have successfully cancelled your booking to ${business?.business_name || 'the business'} for ${booking.booking_date} at ${booking.booking_time}.`,
                is_redeemed: "0",
            });
            return res.status(200).json({
                status: true,
                message: 'Booking cancelled successfully.',
                data: booking,
            });
        }
        catch (err) {
            console.error('cancelBooking error:', err);
            return res.status(500).json({ status: false, message: 'Server error: ' + (err?.message || err) });
        }
    }
    // ─────────────────────────────────────────
    // POST /api/booking/create-advance-order
    // User creates a Razorpay order to pay advance for a booking
    // Body: { booking_id }
    // ─────────────────────────────────────────
    async createAdvancePaymentOrder(req, res) {
        let userId;
        let booking_id;
        try {
            userId = req.user?.id;
            booking_id = req.body.booking_id;
            if (!booking_id) {
                return res.status(422).json({ status: false, message: 'booking_id is required.' });
            }
            const booking = await Booking_1.default.findOne({
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
            const setting = await Setting_1.default.findByPk(1);
            const platformFee = Number(setting?.advance_platform_fee ?? 10);
            const gstPercent = Number(setting?.advance_gst_percent ?? 18);
            // GST applied on platform fee, NOT on the advance amount
            const gstOnPlatformFee = Math.round(platformFee * (gstPercent / 100) * 100) / 100;
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
            const razorpayResp = await axios_1.default.post('https://api.razorpay.com/v1/orders', {
                amount: amountInPaise,
                currency: 'INR',
                receipt: `booking_adv_${booking.id}_${Date.now()}`,
                notes: {
                    booking_id: String(booking.id),
                    user_id: String(userId),
                    type: 'booking_advance',
                },
            }, {
                auth: { username: keyId, password: keySecret },
                timeout: 15000,
            });
            const order = razorpayResp.data;
            // ─── Store Razorpay order ID in booking ───
            await booking.update({ razorpay_order_id: order.id });
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
        }
        catch (err) {
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
    async verifyAdvancePayment(req, res) {
        let userId;
        let booking_id;
        let razorpay_order_id;
        let razorpay_payment_id;
        let razorpay_signature;
        try {
            userId = req.user?.id;
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
            const expectedSig = crypto_1.default
                .createHmac('sha256', keySecret)
                .update(razorpay_order_id + '|' + razorpay_payment_id)
                .digest('hex');
            if (expectedSig !== razorpay_signature) {
                return res.status(400).json({ status: false, message: 'Invalid Razorpay signature.' });
            }
            const booking = await Booking_1.default.findOne({
                where: { id: Number(booking_id), user_id: userId },
            });
            if (!booking) {
                return res.status(404).json({ status: false, message: 'Booking not found.' });
            }
            // ─── Mark advance as paid, auto-confirm booking ───
            await booking.update({
                status: 'accepted', // Auto-confirm once advance is verified
                advance_payment_status: 'paid',
                razorpay_payment_id,
                advance_payment_at: new Date(),
                is_booking_active: true,
            });
            // ─── Create WalletTransaction for business (advance payment credit) ───
            try {
                await WalletTransaction_1.default.create({
                    user_id: booking.business_id,
                    from_user_id: userId,
                    amount: Number(booking.advance_amount) || 0,
                    credit_debit: 'credit',
                    remark: `Advance payment for booking #${booking.id} from user #${userId}`,
                    via: 'advance_payment',
                    source_type: 'advance_payment',
                    settlement_status: 'pending',
                });
            }
            catch (wtErr) {
                console.error('Failed to create wallet transaction for advance payment:', wtErr);
            }
            // ─── Notify Business ───
            const business = await Business_1.default.findByPk(booking.business_id, {
                attributes: ['id', 'business_name', 'remember_token'],
            });
            const user = await User_1.default.findByPk(userId, { attributes: ['id', 'name', 'remember_token'] });
            if (business?.remember_token) {
                const title = `💰 Advance Payment Received!`;
                const body = `${user?.name || 'The customer'} has paid the advance of ₹${Number(booking.advance_amount).toFixed(0)} for the booking on ${booking.booking_date} at ${booking.booking_time}. Booking is now confirmed!`;
                await (0, sendPushNotification_1.sendPushNotification)({
                    title,
                    description: body,
                    data: {
                        type: 'booking_advance_paid',
                        booking_id: String(booking.id),
                        screen: 'businessBookingsView',
                    },
                }, [business.remember_token]);
                await NewUserNotification_1.default.create({
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
                await (0, sendPushNotification_1.sendPushNotification)({ title, description: body, data: { type: 'booking_active', booking_id: String(booking.id), screen: 'bookingHistoryView' } }, [user.remember_token]);
                await NewUserNotification_1.default.create({
                    user_id: userId,
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
        }
        catch (err) {
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
exports.default = new BookingController();
