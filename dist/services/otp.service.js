"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessOtp = exports.createBusinessOtp = exports.getCreatorOtp = exports.createCreatorOtp = void 0;
/**
 * Module: Backend (API Server)
 * File Purpose: OTP Service. DAO for managing temporary authentication codes in the database.
 * Used By: AuthController
 * Database Model: Otp
 * Critical: Yes (Authentication)
 */
const Otp_1 = __importDefault(require("../models/Otp"));
// Create or update creator OTP (no unique key required)
const createCreatorOtp = async (mobile, otp) => {
    const row = await Otp_1.default.findOne({ where: { mobile } });
    if (row)
        await row.update({ otp });
    else
        await Otp_1.default.create({ mobile, otp, business_mobile: null });
};
exports.createCreatorOtp = createCreatorOtp;
// Read last creator OTP
const getCreatorOtp = async (mobile) => {
    return Otp_1.default.findOne({ where: { mobile }, order: [['updated_at', 'DESC']] });
};
exports.getCreatorOtp = getCreatorOtp;
// Create or update business OTP
const createBusinessOtp = async (business_mobile, otp) => {
    const row = await Otp_1.default.findOne({ where: { business_mobile } });
    if (row)
        await row.update({ otp });
    else
        await Otp_1.default.create({ business_mobile, otp, mobile: null });
};
exports.createBusinessOtp = createBusinessOtp;
// Read last business OTP
const getBusinessOtp = async (business_mobile) => {
    return Otp_1.default.findOne({ where: { business_mobile }, order: [['updated_at', 'DESC']] });
};
exports.getBusinessOtp = getBusinessOtp;
