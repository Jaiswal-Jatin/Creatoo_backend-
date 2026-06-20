/**
 * Module: Backend (API Server)
 * File Purpose: Setting Controller. Manages global platform settings and business-specific loyalty configs.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/setting/*
 * Database Model: Setting, User
 * Critical: Yes (Financial/Calculations)
 */
import { Request, Response } from "express";
import Setting from "../models/Setting";
import User from "../models/User";

class SettingController {
  // =======================
  // ADMIN: GET Setting by ID
  // =======================
  async getEditSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await Setting.findByPk(id);

      if (!data) {
        return res.status(404).json({ message: "Setting not found" });
      }

      return res.json({ data });
    } catch (error) {
      return res.status(500).json({ message: "Server error", error });
    }
  }

  // ===========================
  // ADMIN: UPDATE Setting
  // ===========================
  async updateSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        platform_fee_percent,
        gateway_charges,
        reverse_gateway_charges,
      } = req.body;

      const data = await Setting.findByPk(id);

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
    } catch (error) {
      return res.status(500).json({ message: "Server error", error });
    }
  }

  // ===================================================
  // MOBILE API — Business GST + Setting
  // POST /api/setting/setting   (existing method)
  // ===================================================
  async getBusinessSetting(req: Request, res: Response) {
    try {
      const { user_id } = req.body;

      if (!user_id || isNaN(Number(user_id))) {
        return res.status(200).json({
          status: true,
          message: "User ID must be numeric",
          data: [],
        });
      }

      const user = await User.findByPk(user_id);

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

      const setting = await Setting.findByPk(1);

      if (!setting) {
        return res.status(200).json({
          status: true,
          message: "Data not found in settings",
          data: [],
        });
      }

      const result: any = setting.toJSON();
      result.gst_number = gstNumber;

      return res.status(200).json({
        status: true,
        message: "Data found successfully",
        data: result,
      });
    } catch (error) {
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
  async updateBusinessSetting(req: Request, res: Response) {
    try {
      const {
        business_id,
        set_discount,
        min_order,
        set_expiry,
        note,
      } = req.body;

      // Validate business_id
      if (!business_id || isNaN(Number(business_id))) {
        return res.status(400).json({
          status: false,
          message: "business_id is required and must be numeric",
        });
      }

      const user = await User.findByPk(business_id);

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "User not found",
        });
      }

      // Build fieldsToUpdate just like in Laravel
      const fieldsToUpdate: any = {};

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
      const updatedUser = await User.findByPk(business_id, {
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

      const json = updatedUser.toJSON() as any;

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
    } catch (error) {
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
  async getAdvancePaymentSettings(req: Request, res: Response) {
    try {
      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1 } as any);
      }
      return res.json({
        status: true,
        data: {
          advance_platform_fee: setting.advance_platform_fee ?? 10,
          advance_gst_percent: setting.advance_gst_percent ?? 18,
        },
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Server error', error });
    }
  }

  // =====================================================
  // ADMIN: UPDATE Advance Payment Settings
  // PUT /api/setting/advance-payment
  // =====================================================
  async updateAdvancePaymentSettings(req: Request, res: Response) {
    try {
      const { advance_platform_fee, advance_gst_percent } = req.body;
      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1 } as any);
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
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Server error', error });
    }
  }

  // ==========================================================
  // NEW: MOBILE API — /getBusinessSetting (Laravel version)
  // POST /api/setting/getBusinessSetting
  // ==========================================================
  async getBusinessSettingDetails(req: Request, res: Response) {
    try {
      const { business_id } = req.body;

      if (!business_id || isNaN(Number(business_id))) {
        return res.status(400).json({
          status: false,
          message: "Invalid input",
        });
      }

      const businessSetting = await User.findOne({
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

      const plain = businessSetting.toJSON() as any;

      const allEmpty = Object.values(plain).every(
        (value) => value === null || value === ""
      );

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
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Failed",
      });
    }
  }
}

export default new SettingController();
