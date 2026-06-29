/**
 * Module: Backend (API Server)
 * File Purpose: Setting Controller. Manages global platform settings and business-specific loyalty configs.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/setting/*
 * Database Model: Setting, User
 * Critical: Yes (Financial/Calculations)
 */
import { Request, Response } from "express";
import { Op } from "sequelize";
import Setting from "../models/Setting";
import User from "../models/User";
import CreatorPointsTransaction from "../models/CreatorPointsTransaction";
import sequelize from "../db/sequelize";

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
          advance_platform_fee: setting.advance_platform_fee ?? 0,
          advance_platform_fee_active: setting.advance_platform_fee_active ?? false,
          advance_gst_percent: setting.advance_gst_percent ?? 0,
          advance_gst_active: setting.advance_gst_active ?? false,
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
      const { advance_platform_fee, advance_platform_fee_active, advance_gst_percent, advance_gst_active } = req.body;
      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1 } as any);
      }
      if (advance_platform_fee !== undefined) {
        setting.advance_platform_fee = Number(advance_platform_fee);
      }
      if (advance_platform_fee_active !== undefined) {
        setting.advance_platform_fee_active = Boolean(advance_platform_fee_active);
      }
      if (advance_gst_percent !== undefined) {
        setting.advance_gst_percent = Number(advance_gst_percent);
      }
      if (advance_gst_active !== undefined) {
        setting.advance_gst_active = Boolean(advance_gst_active);
      }
      await setting.save();
      return res.json({
        status: true,
        message: 'Advance payment settings updated.',
        data: {
          advance_platform_fee: setting.advance_platform_fee,
          advance_platform_fee_active: setting.advance_platform_fee_active,
          advance_gst_percent: setting.advance_gst_percent,
          advance_gst_active: setting.advance_gst_active,
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
  // =====================================================
  // ADMIN: GET Manual Payment Fee Settings
  // GET /api/setting/manual-payment-fee
  // =====================================================
  async getManualPaymentFeeSettings(req: Request, res: Response) {
    try {
      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1 } as any);
      }
      return res.json({
        status: true,
        data: {
          manual_platform_fee: setting.manual_platform_fee ?? 0,
          manual_platform_fee_active: setting.manual_platform_fee_active ?? false,
          manual_gst_percent: setting.manual_gst_percent ?? 0,
          manual_gst_active: setting.manual_gst_active ?? false,
        },
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Server error', error });
    }
  }

  // =====================================================
  // ADMIN: UPDATE Manual Payment Fee Settings
  // PUT /api/setting/manual-payment-fee
  // =====================================================
  async updateManualPaymentFeeSettings(req: Request, res: Response) {
    try {
      const { manual_platform_fee, manual_platform_fee_active, manual_gst_percent, manual_gst_active } = req.body;
      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1 } as any);
      }
      if (manual_platform_fee !== undefined) {
        setting.manual_platform_fee = Number(manual_platform_fee);
      }
      if (manual_platform_fee_active !== undefined) {
        setting.manual_platform_fee_active = Boolean(manual_platform_fee_active);
      }
      if (manual_gst_percent !== undefined) {
        setting.manual_gst_percent = Number(manual_gst_percent);
      }
      if (manual_gst_active !== undefined) {
        setting.manual_gst_active = Boolean(manual_gst_active);
      }
      await setting.save();
      return res.json({
        status: true,
        message: 'Manual payment fee settings updated.',
        data: {
          manual_platform_fee: setting.manual_platform_fee,
          manual_platform_fee_active: setting.manual_platform_fee_active,
          manual_gst_percent: setting.manual_gst_percent,
          manual_gst_active: setting.manual_gst_active,
        },
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Server error', error });
    }
  }

  // =====================================================
  // ADMIN: GET Signup Bonus Points Setting
  // GET /api/setting/signup-bonus
  // =====================================================
  async getSignupBonusPoints(req: Request, res: Response) {
    try {
      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1 } as any);
      }
      return res.json({
        status: true,
        data: {
          signup_bonus_points: setting.signup_bonus_points ?? 50,
        },
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Server error', error });
    }
  }

  // =====================================================
  // ADMIN: UPDATE Signup Bonus Points (with incremental logic)
  // PUT /api/setting/signup-bonus
  // =====================================================
  async updateSignupBonusPoints(req: Request, res: Response) {
    try {
      const { signup_bonus_points } = req.body;

      if (signup_bonus_points === undefined || isNaN(Number(signup_bonus_points)) || Number(signup_bonus_points) < 0) {
        return res.status(400).json({ status: false, message: "Invalid signup_bonus_points value" });
      }

      const newValue = Math.round(Number(signup_bonus_points));

      let setting = await Setting.findByPk(1);
      if (!setting) {
        setting = await Setting.create({ id: 1, signup_bonus_points: newValue } as any);
        return res.json({
          status: true,
          message: "Setting created.",
          data: { signup_bonus_points: newValue },
        });
      }

      const oldValue = setting.signup_bonus_points ?? 50;
      const diff = newValue - oldValue;

      if (diff > 0) {
        const signupTxns = await CreatorPointsTransaction.findAll({
          where: {
            order_id: { [Op.like]: 'SIGNUP_BONUS_%' },
            business_id: null,
            credit_debit_remaining_status: 'credit',
          },
        });

        const t = await sequelize.transaction();
        try {
          for (const txn of signupTxns) {
            const originalPoints = txn.points;
            const remainingPoints = txn.remaining_points;
            const usedPoints = originalPoints - remainingPoints;

            const newRemaining = Math.max(newValue - usedPoints, 0);
            const additionalRemaining = newRemaining - remainingPoints;

            if (additionalRemaining > 0) {
              await txn.update({
                points: newValue,
                remaining_points: newRemaining,
              }, { transaction: t });

              await User.increment(
                { user_creatoo_points: additionalRemaining },
                { where: { id: txn.user_id }, transaction: t }
              );
            }
          }

          setting.signup_bonus_points = newValue;
          await setting.save({ transaction: t });
          await t.commit();
        } catch (err) {
          await t.rollback();
          throw err;
        }

        return res.json({
          status: true,
          message: `Signup bonus updated to ${newValue}. Existing users received +${diff} additional points.`,
          data: { signup_bonus_points: newValue, applied_diff: diff },
        });
      } else {
        setting.signup_bonus_points = newValue;
        await setting.save();

        return res.json({
          status: true,
          message: diff < 0
            ? `Signup bonus updated to ${newValue}. Existing user points unchanged.`
            : `Signup bonus remains ${newValue}. No changes needed.`,
          data: { signup_bonus_points: newValue, applied_diff: 0 },
        });
      }
    } catch (error) {
      console.error('updateSignupBonusPoints error:', error);
      return res.status(500).json({ status: false, message: 'Server error', error });
    }
  }
}

export default new SettingController();
