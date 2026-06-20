"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const CreatooRequest_1 = __importDefault(require("../models/CreatooRequest"));
const User_1 = __importDefault(require("../models/User"));
const creatooRequest_service_1 = __importDefault(require("../services/creatooRequest.service"));
class CreatooRequestController {
    // MOBILE: POST /creatooRequest  (Laravel: creatooRequest)
    async creatooRequest(req, res) {
        try {
            const { creator_id, business_id, } = req.body;
            // validate creator_id
            if (!creator_id) {
                return res.status(422).json({
                    status: false,
                    message: "creator_id is required",
                });
            }
            const creatorIdNum = Number(creator_id);
            if (Number.isNaN(creatorIdNum)) {
                return res.status(422).json({
                    status: false,
                    message: "creator_id must be numeric",
                });
            }
            const businessIdNum = business_id ? Number(business_id) : null;
            if (business_id && Number.isNaN(businessIdNum)) {
                return res.status(422).json({
                    status: false,
                    message: "business_id must be numeric",
                });
            }
            // Check if user is insta verified (is_insta_verified = '1')
            const validUser = await User_1.default.findOne({
                where: {
                    id: creatorIdNum,
                    is_insta_verified: "1", // change to 1 if your column is tinyint(1)
                },
            });
            if (!validUser) {
                // same behavior as Laravel: 200 with status true + message
                return res.status(200).json({
                    status: true,
                    message: "Please verify your account to request the creatoo points",
                });
            }
            // file check (multer adds req.file)
            const file = req.file;
            if (!file) {
                return res.status(400).json({
                    status: false,
                    message: "Image file not provided",
                });
            }
            // Multer destination is /uploads/images
            // We store relative path "images/<filename>" so admin can use `/uploads/${json.image}`
            const relativeImagePath = `images/${file.filename}`;
            const creatooRequest = await CreatooRequest_1.default.create({
                creator_id: creatorIdNum,
                image: relativeImagePath,
                business_id: businessIdNum,
            });
            return res.status(200).json({
                status: true,
                message: "Creatoo points request submitted successfully",
                data: creatooRequest,
            });
        }
        catch (e) {
            console.error("creatooRequest error:", e);
            return res.status(500).json({
                status: false,
                message: "Failed to add creatoo request: " + (e?.message || "Unknown error"),
            });
        }
    }
    // GET /creatooRequest/all
    async getAllCreatooRequestService(req, res) {
        try {
            const { from_date, to_date, creator_name } = req.query;
            // for dropdown filter like in Laravel
            const creators = await User_1.default.findAll({
                where: { role_id: 3 },
                attributes: ["id", "name"],
            });
            const where = {
                status: { [sequelize_1.Op.in]: [0, 1, 2] },
            };
            if (creator_name && creator_name !== "") {
                where.creator_id = Number(creator_name);
            }
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                where.created_at = { [sequelize_1.Op.between]: [fromDate, toDate] };
            }
            const records = await creatooRequest_service_1.default.fetchRecord({ where });
            const data = records.map((r) => {
                const json = r.toJSON();
                const creator = json.creator || {};
                const business = json.business || {};
                const imageUrl = json.image ? `/uploads/${json.image}` : null;
                let statusHtml = "";
                if (json.status === 0) {
                    statusHtml = `<div><span class="tb-status text-warning" onclick="changeStatus(${json.id},1)" style="cursor:pointer;">Pending</span></div>`;
                }
                else if (json.status === 1) {
                    statusHtml = `<div><span class="tb-status text-success">Approved</span></div>`;
                }
                else if (json.status === 2) {
                    statusHtml = `<div><span class="tb-status text-danger">Rejected</span></div>`;
                }
                const setDiscount = business.set_discount ?? 0;
                const billAmount = json.bill_amount ?? 0;
                const pointsReceived = (setDiscount / 100) * billAmount;
                return {
                    ...json,
                    image: imageUrl
                        ? `<img src="${imageUrl}" alt="Request Image" style="width: 40px; height: 40px; cursor: pointer;" onclick="showImageModal('${imageUrl}')">`
                        : "No Image",
                    status_html: statusHtml,
                    name: creator.name ?? "N/A",
                    business_name: business.business_name ?? "N/A",
                    points_received_text: `${setDiscount}% of ${billAmount} = ${pointsReceived}`,
                };
            });
            return res.json({
                data,
                creators,
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ status: false, message: "Server error" });
        }
    }
    // GET /creatooRequest/allRedeem
    async getAllCreatooRedeemService(req, res) {
        try {
            const { from_date, to_date, business_name } = req.query;
            const businessList = await User_1.default.findAll({
                where: { role_id: 2 },
                attributes: ["id", "business_name"],
            });
            const where = {
                status: 3,
            };
            if (business_name && business_name !== "") {
                where.business_id = Number(business_name);
            }
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                where.created_at = { [sequelize_1.Op.between]: [fromDate, toDate] };
            }
            const records = await creatooRequest_service_1.default.fetchRedeem({ where });
            let totalRedeemPoints = 0;
            const data = records.map((r) => {
                const json = r.toJSON();
                const creator = json.creator || {};
                const business = json.business || {};
                const statusHtml = json.status === 3
                    ? `<div><span class="tb-status text-success">Redeemed</span></div>`
                    : "";
                const points = Number(json.points_received || 0);
                totalRedeemPoints += points;
                return {
                    ...json,
                    status_html: statusHtml,
                    name: creator.name ?? "NA",
                    business_name: business.business_name ?? "NA",
                };
            });
            totalRedeemPoints = Math.round(totalRedeemPoints * 100) / 100;
            return res.json({
                data,
                total_redeemed_points: totalRedeemPoints,
                businessList,
            });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ status: false, message: "Server error" });
        }
    }
    // POST /creatooRequest/change-status
    async changeStatus(req, res) {
        try {
            const { id, status } = req.body;
            if (!id && id !== 0) {
                return res.json({
                    status: "error",
                    message: "Invalid Data",
                });
            }
            const affected = await CreatooRequest_1.default.update({ status }, { where: { id } });
            if (!affected[0]) {
                return res.json({
                    status: "error",
                    message: "Invalid Data",
                });
            }
            const userData = await CreatooRequest_1.default.findByPk(id);
            if (!userData) {
                return res.json({
                    status: "error",
                    message: "Record not found",
                });
            }
            let message = "";
            if (status === 1) {
                await this.updateUserCreatooPoints(userData.creator_id, userData.id, userData.points_received || 0);
                message = "Active status changed successfully";
            }
            else if (status === 0) {
                message = "Inactive status changed successfully";
            }
            else if (status === 2) {
                message = "Request rejected successfully";
            }
            return res.json({
                status: "success",
                message,
            });
        }
        catch (err) {
            console.error(err);
            return res.json({
                status: "error",
                message: "Something went wrong",
            });
        }
    }
    async updateUserCreatooPoints(userId, reqId, points) {
        try {
            const user = await User_1.default.findByPk(userId);
            if (!user) {
                return {
                    status: false,
                    message: "User not found",
                };
            }
            if (!Number.isFinite(points)) {
                return {
                    status: false,
                    message: "Invalid creatoo points value",
                };
            }
            const affected = await CreatooRequest_1.default.update({
                points_received: points,
                active_points: points,
            }, {
                where: {
                    creator_id: userId,
                    id: reqId,
                },
            });
            if (!affected[0]) {
                return {
                    status: false,
                    message: "Failed to update CreatooRequest",
                };
            }
            user.user_creatoo_points =
                Number(user.user_creatoo_points || 0) + points;
            await user.save();
            return {
                status: true,
                message: "Creatoo points added successfully",
                data: user,
            };
        }
        catch (e) {
            return {
                status: false,
                message: "Failed to update creatoo points: " + e.message,
            };
        }
    }
    // POST /creatooRequest/update-bill-amount
    async updateBillAmount(req, res) {
        try {
            const { id, bill_amount } = req.body;
            if (!id || bill_amount == null) {
                return res.json({
                    status: "error",
                    message: "id and bill_amount are required",
                });
            }
            const creatooRequest = await CreatooRequest_1.default.findByPk(id, {
                include: [{ model: User_1.default, as: "business" }],
            });
            if (!creatooRequest) {
                return res.json({
                    status: "error",
                    message: "Record not found",
                });
            }
            const business = creatooRequest.business || {};
            const setDiscount = Number(business.set_discount || 0);
            const pointsReceived = bill_amount * (setDiscount / 100);
            creatooRequest.points_received = pointsReceived;
            creatooRequest.bill_amount = bill_amount;
            await creatooRequest.save();
            return res.json({
                status: "success",
                set_discount: setDiscount,
                bill_amount,
            });
        }
        catch (err) {
            console.error(err);
            return res.json({
                status: "error",
                message: "Something went wrong",
            });
        }
    }
}
exports.default = new CreatooRequestController();
