"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Booking Routes - Endpoints for booking request flow.
 * Used By: User App (customer side), Business App (business side)
 * API Connected: /api/booking/*
 * Database Model: Booking
 * Critical: Yes
 */
const express_1 = require("express");
const authJwt_1 = require("../middleware/authJwt");
const BookingController_1 = __importDefault(require("../controllers/BookingController"));
const router = (0, express_1.Router)();
// ─── Helper: only user role (role_id !== 2) ───
const userOnly = (req, res, next) => {
    const user = req.user;
    if (user?.role_id === 2) {
        return res.status(403).json({ status: false, message: 'Access denied: Users only.' });
    }
    return next();
};
// ─── Helper: only business role (role_id === 2) ───
const businessOnly = (req, res, next) => {
    const user = req.user;
    if (user?.role_id !== 2) {
        return res.status(403).json({ status: false, message: 'Access denied: Businesses only.' });
    }
    return next();
};
/**
 * POST /api/booking/create
 * Role: User (customer)
 * Description: Submits a booking request to a business.
 */
router.post('/create', authJwt_1.authJwt, userOnly, (req, res) => BookingController_1.default.createRequest(req, res));
/**
 * GET /api/booking/user-history
 * Role: User (customer)
 * Description: Returns all booking requests made by the current user.
 */
router.get('/user-history', authJwt_1.authJwt, userOnly, (req, res) => BookingController_1.default.getUserHistory(req, res));
/**
 * GET /api/booking/business-list
 * Role: Business
 * Description: Returns all incoming booking requests for the current business.
 */
router.get('/business-list', authJwt_1.authJwt, businessOnly, (req, res) => BookingController_1.default.getBusinessList(req, res));
/**
 * POST /api/booking/update-status
 * Role: Business
 * Description: Business accepts or rejects a booking request.
 *   - When accepting with advance: include advance_amount in body
 *   - When accepting without advance: omit advance_amount or set to 0
 */
router.post('/update-status', authJwt_1.authJwt, businessOnly, (req, res) => BookingController_1.default.updateStatus(req, res));
/**
 * POST /api/booking/cancel
 * Role: User (customer)
 * Description: Customer cancels their own booking request.
 */
router.post('/cancel', authJwt_1.authJwt, userOnly, (req, res) => BookingController_1.default.cancelBooking(req, res));
/**
 * POST /api/booking/create-advance-order
 * Role: User (customer)
 * Description: Creates a Razorpay order for the booking advance payment.
 *   Body: { booking_id }
 *   Returns: razorpay_order_id, amount, key_id, breakdown (base+GST+platform_fee)
 */
router.post('/create-advance-order', authJwt_1.authJwt, userOnly, (req, res) => BookingController_1.default.createAdvancePaymentOrder(req, res));
/**
 * POST /api/booking/verify-advance-payment
 * Role: User (customer)
 * Description: Verifies Razorpay payment signature and activates the booking.
 *   Body: { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
router.post('/verify-advance-payment', authJwt_1.authJwt, userOnly, (req, res) => BookingController_1.default.verifyAdvancePayment(req, res));
exports.default = router;
