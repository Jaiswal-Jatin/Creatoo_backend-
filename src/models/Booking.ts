/**
 * Module: Backend (API Server)
 * File Purpose: Booking Model - Represents user booking requests to businesses.
 * Used By: BookingController, Notification Scheduler
 * API Connected: /api/booking/*
 * Database Model: bookings table (auto-created via dbSync)
 * Critical: Yes
 */
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';

export interface BookingAttrs {
  id: number;
  user_id: number;
  business_id: number;
  business_category: 'restaurant' | 'salon' | 'turf';
  booking_date: string;           // YYYY-MM-DD
  booking_time: string;           // HH:mm
  guests_count: number | null;    // restaurant / turf
  service_name: string | null;    // salon
  sport_name: string | null;      // turf
  notes: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  reminder_sent: boolean;

  // ─── Advance Payment Fields ───
  advance_amount: number | null;               // amount business requests as advance
  advance_payment_status: 'none' | 'pending' | 'paid' | 'failed';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  advance_payment_at: Date | null;
  is_booking_active: boolean;                 // true once advance is paid (or no advance required)

  created_at?: Date;
  updated_at?: Date;
}

export type BookingCreationAttrs = Optional<
  BookingAttrs,
  | 'id'
  | 'status'
  | 'rejection_reason'
  | 'reminder_sent'
  | 'guests_count'
  | 'service_name'
  | 'sport_name'
  | 'notes'
  | 'advance_amount'
  | 'advance_payment_status'
  | 'razorpay_order_id'
  | 'razorpay_payment_id'
  | 'advance_payment_at'
  | 'is_booking_active'
>;

class Booking extends Model<BookingAttrs, BookingCreationAttrs> implements BookingAttrs {
  public id!: number;
  public user_id!: number;
  public business_id!: number;
  public business_category!: 'restaurant' | 'salon' | 'turf';
  public booking_date!: string;
  public booking_time!: string;
  public guests_count!: number | null;
  public service_name!: string | null;
  public sport_name!: string | null;
  public notes!: string | null;
  public status!: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  public rejection_reason!: string | null;
  public reminder_sent!: boolean;

  // ─── Advance Payment ───
  public advance_amount!: number | null;
  public advance_payment_status!: 'none' | 'pending' | 'paid' | 'failed';
  public razorpay_order_id!: string | null;
  public razorpay_payment_id!: string | null;
  public advance_payment_at!: Date | null;
  public is_booking_active!: boolean;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Booking.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    business_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    business_category: {
      type: DataTypes.ENUM('restaurant', 'salon', 'turf'),
      allowNull: false,
    },
    booking_date: { type: DataTypes.STRING, allowNull: false },
    booking_time: { type: DataTypes.STRING, allowNull: false },
    guests_count: { type: DataTypes.INTEGER, allowNull: true },
    service_name: { type: DataTypes.STRING, allowNull: true },
    sport_name: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    reminder_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // ─── Advance Payment Columns ───
    advance_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    advance_payment_status: {
      type: DataTypes.ENUM('none', 'pending', 'paid', 'failed'),
      allowNull: false,
      defaultValue: 'none',
    },
    razorpay_order_id: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    razorpay_payment_id: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    advance_payment_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    is_booking_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'bookings',
    timestamps: true,
    underscored: true,
  }
);

export default Booking;
