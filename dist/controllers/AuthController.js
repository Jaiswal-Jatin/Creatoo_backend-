"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const user_service_1 = require("../services/user.service");
const otp_service_1 = require("../services/otp.service");
const sms_service_1 = require("../services/sms.service");
const storage_service_1 = require("../services/storage.service");
const sequelize_1 = require("sequelize");
const categoryValidator_1 = require("../utils/categoryValidator");
const ADMIN_BYPASS_OTP = "121512";
const BUSINESS_ROLE_ID = 2; // same as you used in businessRegister
/**
 * Issue JWT for an authenticated user.
 */
const issueToken = (user) => {
    const secret = env_1.default.JWT_SECRET;
    const options = {
        expiresIn: env_1.default.JWT_EXPIRES_IN,
    };
    return jsonwebtoken_1.default.sign({ id: user.id, role_id: user.role_id }, secret, options);
};
const AuthController = {
    // ---------- CREATOR LOGIN ----------
    creatorLogin: async (req, res) => {
        try {
            const { mobile, is_verified } = req.body;
            if (!mobile)
                return res
                    .status(422)
                    .json({ status: false, message: "mobile is required" });
            const user = await (0, user_service_1.findCreatorByMobile)(mobile);
            if (user && !user.is_active)
                return res.json({
                    status: false,
                    message: "User account access restricted",
                });
            // If coming from verification step
            if (is_verified === 1)
                return AuthController.verifyCreatorOtp(req, res);
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await (0, otp_service_1.createCreatorOtp)(mobile, code);
            await (0, sms_service_1.sendOtp)(mobile, code);
            return res.json({
                status: true,
                message: "OTP sent successfully",
                data: { otp: code },
            });
        }
        catch (err) {
            console.error("creatorLogin error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to send OTP" });
        }
    },
    // ---------- CREATOR REGISTER ----------
    creatorRegister: async (req, res) => {
        try {
            const { mobile, email, name, address } = req.body;
            if (!mobile) {
                return res
                    .status(422)
                    .json({ status: false, message: "mobile is required" });
            }
            // mobile already registered check
            const existingByMobile = await (0, user_service_1.findCreatorByMobile)(mobile);
            if (existingByMobile &&
                (existingByMobile.name ||
                    existingByMobile.email ||
                    existingByMobile.address ||
                    existingByMobile.user_image)) {
                return res.status(422).json({
                    status: false,
                    message: "The mobile number is already registered",
                });
            }
            // email already registered check
            if (email) {
                const existingByEmail = await User_1.default.findOne({
                    where: { email },
                });
                if (existingByEmail) {
                    return res.status(422).json({
                        status: false,
                        message: "The email is already registered",
                    });
                }
            }
            // handle optional profile image
            let imageUrl = null;
            if (req.file) {
                const img = await (0, storage_service_1.saveCompressedImage)(req.file);
                imageUrl = img.fileUrl; // store URL only
            }
            const user = await (0, user_service_1.upsertCreator)({
                mobile,
                name,
                email: email ?? null,
                address,
                user_image: imageUrl, // URL
                role_id: 3,
            });
            const token = issueToken(user);
            return res.json({
                status: true,
                message: "Welcome to Creatoo",
                data: {
                    token,
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    address: user.address,
                    image: imageUrl,
                    role_id: user.role_id,
                },
            });
        }
        catch (err) {
            console.error("creatorRegister error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to register creator" });
        }
    },
    // ---------- VERIFY CREATOR OTP ----------
    verifyCreatorOtp: async (req, res) => {
        try {
            const { mobile, otp, device_id, remember_token } = req.body;
            if (!mobile || !otp)
                return res.status(422).json({
                    status: false,
                    message: "mobile and otp are required",
                });
            const user = await (0, user_service_1.findCreatorByMobile)(mobile);
            const last = await (0, otp_service_1.getCreatorOtp)(mobile);
            const valid = (last && last.otp === otp) || otp === ADMIN_BYPASS_OTP;
            if (!valid)
                return res.json({ status: false, message: "Invalid OTP" });
            if (user) {
                if (device_id) {
                    await User_1.default.update({ remember_token: null }, { where: { device_id, id: { [sequelize_1.Op.ne]: user.id } } });
                    await user.update({ device_id, remember_token: remember_token || null });
                }
                else if (remember_token) {
                    await user.update({ remember_token });
                }
                if (!user.name)
                    return res.json({
                        status: true,
                        message: "User is not registered",
                        data: { is_registered: 0 },
                    });
                const token = issueToken(user);
                return res.json({
                    status: true,
                    message: "OTP verified successfully.",
                    data: {
                        token,
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        mobile: user.mobile,
                        address: user.address,
                        is_active: user.is_active,
                        is_registered: 1,
                        role_id: user.role_id,
                    },
                });
            }
            return res.json({
                status: true,
                message: "User is not registered",
                data: { is_registered: 0 },
            });
        }
        catch (err) {
            console.error("verifyCreatorOtp error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to verify OTP" });
        }
    },
    // ---------- RESEND CREATOR OTP ----------
    resendCreatorOtp: async (req, res) => {
        try {
            const { mobile } = req.body;
            if (!mobile)
                return res
                    .status(422)
                    .json({ status: false, message: "Mobile number not provided" });
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await (0, otp_service_1.createCreatorOtp)(mobile, code);
            await (0, sms_service_1.sendOtp)(mobile, code);
            return res.json({
                status: true,
                message: "OTP resent successfully",
                data: { otp: code },
            });
        }
        catch (err) {
            console.error("resendCreatorOtp error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to resend OTP" });
        }
    },
    // ---------- BUSINESS LOGIN ----------
    businessLogin: async (req, res) => {
        try {
            const { business_mobile, is_verified } = req.body;
            if (!business_mobile)
                return res.status(422).json({
                    status: false,
                    message: "business_mobile is required",
                });
            const user = await (0, user_service_1.findBusinessByMobile)(business_mobile);
            if (user && !user.is_active)
                return res.json({
                    status: false,
                    message: "User account access restricted",
                });
            if (is_verified === 1)
                return AuthController.verifyBusinessOtp(req, res);
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await (0, otp_service_1.createBusinessOtp)(business_mobile, code);
            await (0, sms_service_1.sendOtp)(business_mobile, code);
            return res.json({
                status: true,
                message: "OTP sent successfully",
                data: { otp: code },
            });
        }
        catch (err) {
            console.error("businessLogin error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to send OTP" });
        }
    },
    // ---------- BUSINESS REGISTER ----------
    businessRegister: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    message: "No image uploaded",
                });
            }
            // --- CLEAN THE BODY (fixes business_name\t, business_fullname\t, etc.) ---
            const cleanBody = Object.fromEntries(Object.entries(req.body).map(([k, v]) => [k.trim(), v]));
            const mobile = cleanBody.business_mobile;
            const business_email = cleanBody.business_email;
            if (!mobile) {
                return res.status(422).json({
                    status: false,
                    message: "business_mobile is required",
                });
            }
            // --- CHECK MOBILE ALREADY EXISTS ---
            const existing = await (0, user_service_1.findBusinessByMobile)(mobile);
            if (existing &&
                (existing.business_name ||
                    existing.business_fullname ||
                    existing.business_address ||
                    existing.business_image)) {
                return res.status(422).json({
                    status: false,
                    message: "The mobile number is already registered",
                });
            }
            // --- CHECK EMAIL ALREADY EXISTS ---
            if (business_email) {
                const existingEmail = await Business_1.default.findOne({
                    where: { business_email },
                });
                if (existingEmail) {
                    return res.status(422).json({
                        status: false,
                        message: "The email is already registered",
                    });
                }
            }
            // --- SAVE IMAGE ---
            const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(req.file);
            // --- LOAD SETTINGS ---
            const settings = await (0, user_service_1.settingsSnapshot)();
            // --- VALIDATE CATEGORY ATTRIBUTES ---
            const category = cleanBody.business_category || 'restaurant';
            let categoryAttributes = null;
            if (cleanBody.category_attributes) {
                const validation = (0, categoryValidator_1.validateCategoryAttributes)(category, cleanBody.category_attributes);
                if (!validation.status) {
                    return res.status(422).json({
                        status: false,
                        message: validation.message,
                    });
                }
                categoryAttributes = validation.cleanData;
            }
            // --- UPSERT BUSINESS ---
            const user = await (0, user_service_1.upsertBusiness)({
                business_mobile: mobile,
                business_name: cleanBody.business_name || null,
                business_fullname: cleanBody.business_fullname || null,
                business_email: business_email ?? null,
                business_address: cleanBody.business_address || null,
                business_area: cleanBody.business_area || null,
                business_designation: cleanBody.business_designation || null,
                business_site_url: cleanBody.business_site_url || null,
                gst_number: cleanBody.gst_number || null,
                business_type_id: cleanBody.business_type_id || null,
                business_category: category,
                category_attributes: categoryAttributes,
                upi_id: cleanBody.upi_id || null,
                business_image: fileUrl,
                role_id: 2,
                time_from: null,
                time_to: null,
                ...settings,
            });
            // --- ISSUE TOKEN ---
            const token = issueToken(user);
            return res.json({
                status: true,
                message: "Welcome to Creatoo",
                data: {
                    token,
                    id: user.id,
                    business_fullname: user.business_fullname,
                    business_name: user.business_name,
                    business_email: user.business_email,
                    business_mobile: user.business_mobile,
                    business_address: user.business_address,
                    business_area: user.business_area,
                    business_designation: user.business_designation,
                    business_site_url: user.business_site_url,
                    business_type_id: user.business_type_id,
                    business_category: user.business_category,
                    category_attributes: user.category_attributes,
                    business_image: user.business_image,
                    gst_number: user.gst_number,
                    upi_id: user.upi_id,
                    platform_fee_percent: user.platform_fee_percent,
                    gateway_charges: user.gateway_charges,
                    reverse_gateway_charges: user.reverse_gateway_charges,
                    min_threshold: user.min_threshold,
                    role_id: user.role_id,
                },
            });
        }
        catch (err) {
            console.error("businessRegister error:", err);
            return res.status(500).json({
                status: false,
                message: "Failed to register business",
            });
        }
    },
    // ---------- VERIFY BUSINESS OTP ----------
    verifyBusinessOtp: async (req, res) => {
        try {
            const { business_mobile, otp, device_id, remember_token } = req.body;
            if (!business_mobile || !otp)
                return res.status(422).json({
                    status: false,
                    message: "business_mobile and otp are required",
                });
            const user = await (0, user_service_1.findBusinessByMobile)(business_mobile);
            if (!user) {
                return res
                    .status(403)
                    .json({ status: false, message: "User Not exist" });
            }
            const last = await (0, otp_service_1.getBusinessOtp)(business_mobile);
            const valid = (last && last.otp === otp) || otp === ADMIN_BYPASS_OTP;
            if (!valid)
                return res.json({ status: false, message: "Invalid OTP" });
            if (device_id) {
                await Business_1.default.update({ remember_token: null }, { where: { device_id, id: { [sequelize_1.Op.ne]: user.id } } });
                await user.update({ device_id, remember_token: remember_token || null });
            }
            else if (remember_token) {
                await user.update({ remember_token });
            }
            const token = issueToken(user);
            return res.json({
                status: true,
                message: "OTP verified successfully",
                data: {
                    token,
                    id: user.id,
                    business_fullname: user.business_fullname,
                    business_email: user.business_email,
                    business_mobile: user.business_mobile,
                    business_address: user.business_address,
                    is_active: user.is_active,
                    is_registered: 1,
                    role_id: user.role_id,
                },
            });
        }
        catch (err) {
            console.error("verifyBusinessOtp error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to verify OTP" });
        }
    },
    // ---------- RESEND BUSINESS OTP ----------
    resendBusinessOtp: async (req, res) => {
        try {
            const { business_mobile } = req.body;
            if (!business_mobile)
                return res
                    .status(422)
                    .json({ status: false, message: "Mobile number not provided" });
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await (0, otp_service_1.createBusinessOtp)(business_mobile, code);
            await (0, sms_service_1.sendOtp)(business_mobile, code);
            return res.json({
                status: true,
                message: "OTP resent successfully",
                data: { otp: code },
            });
        }
        catch (err) {
            console.error("resendBusinessOtp error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to resend OTP" });
        }
    },
    // ---------- INSTAGRAM VERIFICATION ----------
    submitInstaVerification: async (req, res) => {
        try {
            const { mobile, username } = req.body;
            if (!mobile || !username || !req.file)
                return res.status(422).json({
                    status: false,
                    message: "mobile, username and profile_image are required",
                });
            const user = await (0, user_service_1.findCreatorByMobile)(mobile);
            if (!user)
                return res
                    .status(404)
                    .json({ status: false, message: "User not found" });
            const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(req.file);
            await user.update({
                instagram_username: username,
                profile_image: fileUrl,
                is_insta_verified: 0,
                verification_note: "Your profile is under review.",
            });
            return res.json({
                status: true,
                message: "Verify Instagram Account request submitted successfully.",
                data: { is_insta_verified: 0 },
            });
        }
        catch (err) {
            console.error("submitInstaVerification error:", err);
            return res
                .status(500)
                .json({ status: false, message: "Failed to submit verification" });
        }
    },
    // ---------- EDIT BUSINESS PROFILE ----------
    editBusinessProfile: async (req, res) => {
        try {
            // --- CLEAN BODY KEYS (handles business_name\t, etc.) ---
            const rawBody = req.body || {};
            const body = Object.fromEntries(Object.entries(rawBody).map(([k, v]) => [k.trim(), v]));
            const { id } = body;
            if (!id || isNaN(Number(id))) {
                return res.status(400).json({
                    status: false,
                    message: "Valid business id is required",
                });
            }
            const userId = Number(id);
            const user = await Business_1.default.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "Business user not found",
                });
            }
            const updateData = {};
            // --- OPTIONAL: update business_mobile with uniqueness check ---
            if ("business_mobile" in body && body.business_mobile) {
                const newMobile = String(body.business_mobile);
                // only check if actually changed
                if (newMobile !== user.business_mobile) {
                    const existing = await (0, user_service_1.findBusinessByMobile)(newMobile);
                    if (existing && existing.id !== userId) {
                        return res.status(422).json({
                            status: false,
                            message: "The mobile number is already registered",
                        });
                    }
                }
                updateData.business_mobile = newMobile;
            }
            // --- BASIC FIELDS ---
            if ("business_name" in body)
                updateData.business_name = body.business_name;
            if ("business_fullname" in body)
                updateData.business_fullname = body.business_fullname;
            if ("business_address" in body)
                updateData.business_address = body.business_address;
            if ("business_area" in body)
                updateData.business_area = body.business_area;
            if ("business_site_url" in body)
                updateData.business_site_url = body.business_site_url;
            if ("business_designation" in body)
                updateData.business_designation = body.business_designation;
            if ("gst_number" in body)
                updateData.gst_number = body.gst_number;
            // --- VALIDATE CATEGORY ATTRIBUTES ---
            const targetCategory = "business_category" in body ? body.business_category : user.business_category;
            if ("category_attributes" in body) {
                const validation = (0, categoryValidator_1.validateCategoryAttributes)(targetCategory, body.category_attributes);
                if (!validation.status) {
                    return res.status(422).json({
                        status: false,
                        message: validation.message,
                    });
                }
                updateData.category_attributes = validation.cleanData;
            }
            if ("business_category" in body) {
                if (body.business_category !== user.business_category) {
                    updateData.business_category = body.business_category;
                    // Clear legacy attributes on category type switch if not explicitly updated
                    if (!("category_attributes" in body)) {
                        updateData.category_attributes = null;
                    }
                }
            }
            if ("upi_id" in body)
                updateData.upi_id = body.upi_id || null;
            // --- EMAIL UPDATE WITH UNIQUENESS CHECK ---
            if ("business_email" in body) {
                const newEmail = body.business_email || null;
                if (newEmail && newEmail !== user.business_email) {
                    const existingEmail = await Business_1.default.findOne({
                        where: { business_email: newEmail },
                    });
                    if (existingEmail && existingEmail.id !== userId) {
                        return res.status(422).json({
                            status: false,
                            message: "The email is already registered",
                        });
                    }
                }
                updateData.business_email = newEmail;
            }
            // --- HANDLE NEW business_image (save new, then delete old) ---
            if (req.file) {
                const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(req.file);
                const old = user.business_image;
                if (old) {
                    // fire and forget or await if you want strict sequencing
                    (0, storage_service_1.deleteIfExists)(old);
                }
                updateData.business_image = fileUrl;
            }
            // --- APPLY UPDATES ---
            await user.update(updateData);
            const profile = await Business_1.default.findOne({
                where: { id: userId },
                attributes: [
                    "id",
                    "business_name",
                    "business_fullname",
                    "business_mobile",
                    "business_email",
                    "business_address",
                    "business_area",
                    "business_site_url",
                    "business_designation",
                    "gst_number",
                    "business_category",
                    "category_attributes",
                    "business_image",
                    "upi_id",
                    "role_id",
                    "is_active",
                ],
            });
            return res.json({
                status: true,
                message: "Business Profile updated successfully",
                data: profile,
            });
        }
        catch (err) {
            console.error("editBusinessProfile error:", err);
            return res.status(500).json({
                status: false,
                message: "Internal server error",
            });
        }
    },
    // ---------- EDIT CREATOR PROFILE ----------
    editCreatorProfile: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    status: false,
                    message: "Unauthorized",
                });
            }
            const user = await User_1.default.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "Creator not found",
                });
            }
            const body = req.body;
            const updateData = {};
            if ("name" in body)
                updateData.name = body.name;
            if ("instagram_link" in body)
                updateData.instagram_link = body.instagram_link;
            if ("address" in body)
                updateData.address = body.address;
            if ("instagram_username" in body)
                updateData.instagram_username = body.instagram_username;
            // Handle new user_image
            if (req.file) {
                const old = user.user_image;
                if (old)
                    (0, storage_service_1.deleteIfExists)(old);
                const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(req.file);
                updateData.user_image = fileUrl;
            }
            await user.update(updateData);
            const profile = await User_1.default.findOne({
                where: { id: userId },
                attributes: [
                    "id",
                    "name",
                    "mobile",
                    "email",
                    "address",
                    "instagram_username",
                    "instagram_link",
                    "bio",
                    "user_image",
                    "role_id",
                    "is_active",
                ],
            });
            return res.json({
                status: true,
                message: "Creator Profile updated successfully",
                data: profile,
            });
        }
        catch (err) {
            console.error("editCreatorProfile error:", err);
            return res.status(500).json({
                status: false,
                message: "Internal server error",
            });
        }
    },
    async listBusinessUsers(req, res) {
        try {
            const where = { role_id: BUSINESS_ROLE_ID };
            if (typeof req.query.is_active !== "undefined") {
                const val = String(req.query.is_active).toLowerCase();
                if (val === "true" || val === "1")
                    where.is_active = true;
                if (val === "false" || val === "0")
                    where.is_active = false;
            }
            const users = await Business_1.default.findAll({
                where,
                attributes: [
                    "id",
                    "business_fullname",
                    "business_name",
                    "business_email",
                    "business_mobile",
                    "business_address",
                    "business_area",
                    "business_designation",
                    "business_site_url",
                    "gst_number",
                    "business_image",
                    "is_active",
                    "role_id",
                    "createdAt",
                ],
                order: [["createdAt", "DESC"]],
            });
            return res.json({ status: true, data: users });
        }
        catch (err) {
            console.error("listBusinessUsers error:", err);
            return res.status(500).json({
                status: false,
                message: err.message || "Failed to fetch business users",
            });
        }
    },
    /**
     * POST /api/admin/business/change-status
     * Body: { "id": 900, "is_active": true }
     */
    async changeBusinessActiveStatus(req, res) {
        try {
            const { id, is_active } = req.body;
            if (!id || isNaN(Number(id))) {
                return res.status(422).json({
                    status: false,
                    message: "Valid business user id is required",
                });
            }
            if (typeof is_active === "undefined") {
                return res.status(422).json({
                    status: false,
                    message: "is_active is required (true/false)",
                });
            }
            const userId = Number(id);
            const user = await Business_1.default.findOne({
                where: { id: userId },
            });
            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "Business user not found",
                });
            }
            await user.update({ is_active: Boolean(is_active) });
            return res.json({
                status: true,
                message: "Business user status updated successfully",
                data: {
                    id: user.id,
                    business_fullname: user.business_fullname,
                    business_email: user.business_email,
                    business_mobile: user.business_mobile,
                    is_active: user.is_active,
                },
            });
        }
        catch (err) {
            console.error("changeBusinessActiveStatus error:", err);
            return res.status(500).json({
                status: false,
                message: err.message || "Failed to update business status",
            });
        }
    },
    /**
    * POST /api/admin/business/create
    * Admin creates a new business user (similar to businessRegister, but:
    *  - no OTP
    *  - image is OPTIONAL
    */
    async createBusiness(req, res) {
        try {
            // Clean body keys (handles stuff like "business_name\t")
            const cleanBody = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [k.trim(), v]));
            const mobile = cleanBody.business_mobile;
            const business_email = cleanBody.business_email;
            if (!mobile) {
                return res.status(422).json({
                    status: false,
                    message: "business_mobile is required",
                });
            }
            // MOBILE UNIQUE CHECK
            const existing = await (0, user_service_1.findBusinessByMobile)(mobile);
            if (existing &&
                (existing.business_name ||
                    existing.business_fullname ||
                    existing.business_address ||
                    existing.business_image)) {
                return res.status(422).json({
                    status: false,
                    message: "The mobile number is already registered",
                });
            }
            // EMAIL UNIQUE CHECK
            if (business_email) {
                const existingEmail = await Business_1.default.findOne({
                    where: { business_email },
                });
                if (existingEmail) {
                    return res.status(422).json({
                        status: false,
                        message: "The email is already registered",
                    });
                }
            }
            // OPTIONAL IMAGE
            let imageUrl = null;
            if (req.file) {
                const { fileUrl } = await (0, storage_service_1.saveCompressedImage)(req.file);
                imageUrl = fileUrl;
            }
            // SETTINGS (platform_fee_percent, min_threshold, etc.)
            const settings = await (0, user_service_1.settingsSnapshot)();
            const user = await (0, user_service_1.upsertBusiness)({
                business_mobile: mobile,
                business_name: cleanBody.business_name || null,
                business_fullname: cleanBody.business_fullname || null,
                business_email: business_email ?? null,
                business_address: cleanBody.business_address || null,
                business_area: cleanBody.business_area || null,
                business_designation: cleanBody.business_designation || null,
                business_site_url: cleanBody.business_site_url || null,
                gst_number: cleanBody.gst_number || null,
                business_type_id: cleanBody.business_type_id || null,
                business_category: cleanBody.business_category || null,
                category_attributes: cleanBody.category_attributes || null,
                business_image: imageUrl,
                role_id: BUSINESS_ROLE_ID,
                is_active: typeof cleanBody.is_active !== "undefined"
                    ? Boolean(cleanBody.is_active)
                    : true,
                ...settings,
            });
            return res.status(201).json({
                status: true,
                message: "Business registered successfully by admin",
                data: {
                    id: user.id,
                    business_fullname: user.business_fullname,
                    business_name: user.business_name,
                    business_email: user.business_email,
                    business_mobile: user.business_mobile,
                    business_address: user.business_address,
                    business_area: user.business_area,
                    business_designation: user.business_designation,
                    business_site_url: user.business_site_url,
                    business_type_id: user.business_type_id,
                    business_image: user.business_image,
                    gst_number: user.gst_number,
                    platform_fee_percent: user.platform_fee_percent,
                    gateway_charges: user.gateway_charges,
                    reverse_gateway_charges: user.reverse_gateway_charges,
                    min_threshold: user.min_threshold,
                    is_active: user.is_active,
                    role_id: user.role_id,
                },
            });
        }
        catch (err) {
            console.error("createBusiness (admin) error:", err);
            return res.status(500).json({
                status: false,
                message: err.message || "Failed to create business user",
            });
        }
    },
    // ---------- LOGOUT ----------
    logout: async (_req, res) => {
        return res.json({ status: true, message: "Logout successful" });
    },
};
exports.default = AuthController;
