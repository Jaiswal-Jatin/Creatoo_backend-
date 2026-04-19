/**
 * Module: Backend (API Server)
 * File Purpose: OTP Service. DAO for managing temporary authentication codes in the database.
 * Used By: AuthController
 * Database Model: Otp
 * Critical: Yes (Authentication)
 */
import Otp from '../models/Otp';

// Create or update creator OTP (no unique key required)
export const createCreatorOtp = async (mobile: string, otp: string) => {
  const row = await Otp.findOne({ where: { mobile } });
  if (row) await row.update({ otp });
  else await Otp.create({ mobile, otp, business_mobile: null });
};

// Read last creator OTP
export const getCreatorOtp = async (mobile: string) => {
  return Otp.findOne({ where: { mobile }, order: [['updated_at', 'DESC']] });
};

// Create or update business OTP
export const createBusinessOtp = async (business_mobile: string, otp: string) => {
  const row = await Otp.findOne({ where: { business_mobile } });
  if (row) await row.update({ otp });
  else await Otp.create({ business_mobile, otp, mobile: null });
};

// Read last business OTP
export const getBusinessOtp = async (business_mobile: string) => {
  return Otp.findOne({ where: { business_mobile }, order: [['updated_at', 'DESC']] });
};
