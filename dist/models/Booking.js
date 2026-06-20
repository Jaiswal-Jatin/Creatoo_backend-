"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Booking Model - Represents user booking requests to businesses.
 * Used By: BookingController, Notification Scheduler
 * API Connected: /api/booking/*
 * Database Model: bookings table (auto-created via dbSync)
 * Critical: Yes
 */
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class Booking extends sequelize_1.Model {
}
Booking.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    business_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    business_category: {
        type: sequelize_1.DataTypes.ENUM('restaurant', 'salon', 'turf'),
        allowNull: false,
    },
    booking_date: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    booking_time: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    guests_count: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    service_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    sport_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    notes: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    rejection_reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    reminder_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    // ─── Advance Payment Columns ───
    advance_amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
    },
    advance_payment_status: {
        type: sequelize_1.DataTypes.ENUM('none', 'pending', 'paid', 'failed'),
        allowNull: false,
        defaultValue: 'none',
    },
    razorpay_order_id: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: null },
    razorpay_payment_id: { type: sequelize_1.DataTypes.STRING, allowNull: true, defaultValue: null },
    advance_payment_at: { type: sequelize_1.DataTypes.DATE, allowNull: true, defaultValue: null },
    is_booking_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    created_at: { type: sequelize_1.DataTypes.DATE },
    updated_at: { type: sequelize_1.DataTypes.DATE },
}, {
    sequelize: db_1.default,
    tableName: 'bookings',
    timestamps: true,
    underscored: true,
});
exports.default = Booking;
