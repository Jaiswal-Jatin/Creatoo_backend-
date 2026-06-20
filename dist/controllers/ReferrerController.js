"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Referrer_1 = __importDefault(require("../models/Referrer"));
const Order_1 = __importDefault(require("../models/Order"));
class ReferrerController {
    // GET /referrer/all
    async index(req, res) {
        try {
            const referrers = await Referrer_1.default.findAll({
                where: { role_id: 4 },
                order: [["id", "DESC"]],
            });
            const data = referrers.map((rec) => {
                const json = rec.toJSON();
                const action = `
          <ul class="nk-tb-actions gx-1 my-n1">
            <li class="me-n1">
              <div class="dropdown">
                <a href="#" class="dropdown-toggle btn btn-icon btn-trigger" data-bs-toggle="dropdown">
                  <em class="icon ni ni-more-h"></em>
                </a>
                <div class="dropdown-menu dropdown-menu-end">
                  <ul class="link-list-opt no-bdr">
                    <li>
                      <a href="/referrer/edit/${json.id}">
                        <em class="icon ni ni-edit"></em>
                        <span>Edit Referrer</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
          </ul>
        `;
                return { ...json, action };
            });
            return res.json({ data });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ status: false, message: "Server error" });
        }
    }
    // GET /referrer/add
    async create(_req, res) {
        return res.json({
            status: true,
            message: "Use POST /api/referrer/add to create a new referrer.",
        });
    }
    // POST /referrer/add
    async store(req, res) {
        try {
            const { name, referrer_mobile_number, referrer_code } = req.body;
            if (!name || !referrer_mobile_number || !referrer_code) {
                return res.status(400).json({
                    status: false,
                    message: "name, referrer_mobile_number and referrer_code are required.",
                });
            }
            if (referrer_code.length < 3 || referrer_code.length > 10) {
                return res.status(400).json({
                    status: false,
                    message: "Referrer code must be between 3 and 10 characters.",
                });
            }
            // Unique mobile number
            const existingMobile = await Referrer_1.default.findOne({
                where: { referrer_mobile_number },
            });
            if (existingMobile) {
                return res.status(400).json({
                    status: false,
                    message: "The referrer mobile number is already taken.",
                });
            }
            // Unique referrer code
            const existingCode = await Referrer_1.default.findOne({
                where: { referrer_code },
            });
            if (existingCode) {
                return res.status(400).json({
                    status: false,
                    message: "This referrer code is already taken.",
                });
            }
            // Create referrer
            const user = await Referrer_1.default.create({
                name,
                referrer_mobile_number,
                role_id: 4,
                referrer_code,
            });
            // Referral logic (same as Laravel)
            const referrer = await Referrer_1.default.findOne({
                where: { referrer_code },
            });
            if (!referrer) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid referrer code.",
                });
            }
            const businessId = referrer.id;
            const alreadyUsed = await Order_1.default.findOne({
                where: {
                    user_id: user.id,
                    referrer_id: referrer.id,
                    business_id: businessId,
                },
            });
            if (alreadyUsed) {
                return res.status(400).json({
                    status: false,
                    message: "You have already used this referral code for this business.",
                });
            }
            return res.status(201).json({
                status: true,
                message: "Referrer added successfully.",
                data: user,
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ status: false, message: "Server error" });
        }
    }
    // GET /referrer/edit/:id
    async edit(req, res) {
        try {
            const { id } = req.params;
            const referrer = await Referrer_1.default.findByPk(id);
            if (!referrer || referrer.role_id !== 4) {
                return res.status(404).json({
                    status: false,
                    message: "Referrer not found.",
                });
            }
            return res.json({ status: true, data: referrer });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ status: false, message: "Server error" });
        }
    }
    // POST /referrer/update/:id
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, referrer_mobile_number, referrer_code } = req.body;
            if (!name || !referrer_mobile_number || !referrer_code) {
                return res.status(400).json({
                    status: false,
                    message: "name, referrer_mobile_number and referrer_code are required.",
                });
            }
            const referrer = await Referrer_1.default.findByPk(id);
            if (!referrer || referrer.role_id !== 4) {
                return res.status(404).json({
                    status: false,
                    message: "Referrer not found.",
                });
            }
            // Unique mobile check (ignore current)
            const existingMobile = await Referrer_1.default.findOne({
                where: {
                    referrer_mobile_number,
                    id: { [sequelize_1.Op.ne]: id },
                },
            });
            if (existingMobile) {
                return res.status(400).json({
                    status: false,
                    message: "Mobile number already taken.",
                });
            }
            // Unique code check (ignore current)
            const existingCode = await Referrer_1.default.findOne({
                where: {
                    referrer_code,
                    id: { [sequelize_1.Op.ne]: id },
                },
            });
            if (existingCode) {
                return res.status(400).json({
                    status: false,
                    message: "The referrer code you entered is already taken.",
                });
            }
            referrer.name = name;
            referrer.referrer_mobile_number = referrer_mobile_number;
            referrer.referrer_code = referrer_code;
            await referrer.save();
            return res.json({
                status: true,
                message: "Referrer updated successfully.",
                data: referrer,
            });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ status: false, message: "Server error" });
        }
    }
}
exports.default = new ReferrerController();
