"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = __importDefault(require("../models/Setting"));
const User_1 = __importDefault(require("../models/User"));
class SettingController {
    // =======================
    // ADMIN: GET Setting by ID
    // =======================
    async getEditSetting(req, res) {
        try {
            const { id } = req.params;
            const data = await Setting_1.default.findByPk(id);
            if (!data) {
                return res.status(404).json({ message: "Setting not found" });
            }
            return res.json({ data });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    }
    // ===========================
    // ADMIN: UPDATE Setting
    // ===========================
    async updateSetting(req, res) {
        try {
            const { id } = req.params;
            const { platform_fee_percent, gateway_charges, reverse_gateway_charges, } = req.body;
            const data = await Setting_1.default.findByPk(id);
            if (!data) {
                return res.status(404).json({ message: "Setting not found" });
            }
            data.platform_fee_percent = platform_fee_percent;
            data.gateway_charges = gateway_charges;
            data.reverse_gateway_charges = reverse_gateway_charges;
            await data.save();
            return res.json({
                message: "Details updated successfully.",
                data,
            });
        }
        catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    }
    // ===================================================
    // MOBILE API — Business GST + Setting
    // POST /api/setting/setting   (existing method)
    // ===================================================
    async getBusinessSetting(req, res) {
        try {
            const { user_id } = req.body;
            if (!user_id || isNaN(Number(user_id))) {
                return res.status(200).json({
                    status: true,
                    message: "User ID must be numeric",
                    data: [],
                });
            }
            const user = await User_1.default.findByPk(user_id);
            if (!user) {
                return res.status(200).json({
                    status: true,
                    message: "User not found",
                    data: [],
                });
            }
            // Must be a business user
            if (user.role_id !== 2) {
                return res.status(200).json({
                    status: true,
                    message: "User is not business",
                    data: [],
                });
            }
            const gstNumber = user.gst_number ?? "";
            const setting = await Setting_1.default.findByPk(1);
            if (!setting) {
                return res.status(200).json({
                    status: true,
                    message: "Data not found in settings",
                    data: [],
                });
            }
            const result = setting.toJSON();
            result.gst_number = gstNumber;
            return res.status(200).json({
                status: true,
                message: "Data found successfully",
                data: result,
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed",
            });
        }
    }
    // ===================================================
    // NEW: MOBILE API — /businessSetting (Laravel version)
    // POST /api/setting/businessSetting
    // ===================================================
    async updateBusinessSetting(req, res) {
        try {
            const { business_id, set_discount, min_order, set_expiry, note, } = req.body;
            // Validate business_id
            if (!business_id || isNaN(Number(business_id))) {
                return res.status(400).json({
                    status: false,
                    message: "business_id is required and must be numeric",
                });
            }
            const user = await User_1.default.findByPk(business_id);
            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: "User not found",
                });
            }
            // Build fieldsToUpdate just like in Laravel
            const fieldsToUpdate = {};
            if (set_discount !== undefined) {
                fieldsToUpdate.set_discount = Number(set_discount);
            }
            if (min_order !== undefined) {
                fieldsToUpdate.min_order = Number(min_order);
            }
            if (set_expiry !== undefined) {
                fieldsToUpdate.set_expiry = Number(set_expiry);
            }
            if (note !== undefined) {
                fieldsToUpdate.creatoo_note = note;
            }
            if (Object.keys(fieldsToUpdate).length === 0) {
                return res.status(400).json({
                    status: false,
                    message: "No fields to update.",
                });
            }
            await user.update(fieldsToUpdate);
            // Fetch updated data similar to Laravel:
            const updatedUser = await User_1.default.findByPk(business_id, {
                attributes: [
                    "id",
                    "set_discount",
                    "min_order",
                    "set_expiry",
                    "creatoo_note",
                ],
            });
            if (!updatedUser) {
                // Very unlikely since we just updated, but handle anyway
                return res.status(500).json({
                    status: false,
                    message: "Failed to update setting.",
                });
            }
            const json = updatedUser.toJSON();
            return res.status(200).json({
                status: true,
                message: "Business setting updated successfully.",
                data: {
                    id: json.id,
                    set_discount: json.set_discount,
                    min_order: json.min_order,
                    set_expiry: json.set_expiry,
                    note: json.creatoo_note, // alias like Laravel
                },
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed to update setting.",
            });
        }
    }
    // =====================================================
    // ADMIN: GET Advance Payment Settings
    // GET /api/setting/advance-payment
    // =====================================================
    async getAdvancePaymentSettings(req, res) {
        try {
            let setting = await Setting_1.default.findByPk(1);
            if (!setting) {
                setting = await Setting_1.default.create({ id: 1 });
            }
            return res.json({
                status: true,
                data: {
                    advance_platform_fee: setting.advance_platform_fee ?? 10,
                    advance_gst_percent: setting.advance_gst_percent ?? 18,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ status: false, message: 'Server error', error });
        }
    }
    // =====================================================
    // ADMIN: UPDATE Advance Payment Settings
    // PUT /api/setting/advance-payment
    // =====================================================
    async updateAdvancePaymentSettings(req, res) {
        try {
            const { advance_platform_fee, advance_gst_percent } = req.body;
            let setting = await Setting_1.default.findByPk(1);
            if (!setting) {
                setting = await Setting_1.default.create({ id: 1 });
            }
            if (advance_platform_fee !== undefined) {
                setting.advance_platform_fee = Number(advance_platform_fee);
            }
            if (advance_gst_percent !== undefined) {
                setting.advance_gst_percent = Number(advance_gst_percent);
            }
            await setting.save();
            return res.json({
                status: true,
                message: 'Advance payment settings updated.',
                data: {
                    advance_platform_fee: setting.advance_platform_fee,
                    advance_gst_percent: setting.advance_gst_percent,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ status: false, message: 'Server error', error });
        }
    }
    // ==========================================================
    // NEW: MOBILE API — /getBusinessSetting (Laravel version)
    // POST /api/setting/getBusinessSetting
    // ==========================================================
    async getBusinessSettingDetails(req, res) {
        try {
            const { business_id } = req.body;
            if (!business_id || isNaN(Number(business_id))) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid input",
                });
            }
            const businessSetting = await User_1.default.findOne({
                attributes: ["id", "set_discount", "min_order", "set_expiry", "creatoo_note"],
                where: {
                    id: business_id,
                    role_id: 2, // same as Laravel: where role_id = 2
                },
            });
            if (!businessSetting) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid input",
                });
            }
            const plain = businessSetting.toJSON();
            const allEmpty = Object.values(plain).every((value) => value === null || value === "");
            if (allEmpty) {
                return res.status(200).json({
                    status: false,
                    message: "Data not found",
                    data: [],
                });
            }
            return res.status(200).json({
                status: true,
                message: "Data found Successfully",
                data: plain,
            });
        }
        catch (error) {
            return res.status(500).json({
                status: false,
                message: "Failed",
            });
        }
    }
}
exports.default = new SettingController();
