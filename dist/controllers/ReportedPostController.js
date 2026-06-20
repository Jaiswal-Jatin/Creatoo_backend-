"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const Post_1 = __importDefault(require("../models/Post"));
const PostReport_1 = __importDefault(require("../models/PostReport"));
const reportedPost_service_1 = __importDefault(require("../services/reportedPost.service"));
class ReportedPostController {
    // GET /reportedPost/all
    async getAllReportedPostService(req, res) {
        try {
            const records = await reportedPost_service_1.default.fetchRecord();
            // Filter only posts where user role_id == 3 (creator)
            const dataPromises = records.map(async (record) => {
                const user = await User_1.default.findByPk(record.user_id);
                if (!user || user.role_id !== 3)
                    return null;
                const json = record.toJSON();
                return {
                    ...json,
                    user_name: user.name,
                    formatted_created_at: new Date(json.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                };
            });
            const resolved = await Promise.all(dataPromises);
            const filtered = resolved.filter((r) => r !== null);
            return res.json({ data: filtered });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ status: false, message: "Server error" });
        }
    }
    // GET /reportedPost/getUserReportedPost
    async getUserReportedPost(req, res) {
        try {
            const { from_date, to_date } = req.query;
            const where = {};
            if (from_date && to_date) {
                const fromDate = new Date(from_date);
                const toDate = new Date(to_date);
                toDate.setHours(23, 59, 59, 999);
                where.created_at = { [sequelize_1.Op.between]: [fromDate, toDate] };
            }
            const reports = await PostReport_1.default.findAll({
                where,
                include: [
                    {
                        model: Post_1.default,
                        as: "post",
                        attributes: ["id", "name", "is_reported"],
                    },
                    {
                        model: User_1.default,
                        as: "user",
                        attributes: ["id", "name"],
                    },
                ],
                order: [["created_at", "DESC"]],
            });
            const data = reports.map((r) => {
                const json = r.toJSON();
                const post = json.post || {};
                const user = json.user || {};
                let isReportedHtml = "";
                if (post.is_reported === 0 || post.is_reported === "0") {
                    isReportedHtml = `<span class="tb-status text-warning cursor-pointer" onclick="showApprovalPopup(${json.id})" style="cursor:pointer;">Pending</span>`;
                }
                else if (post.is_reported === 1 || post.is_reported === "1") {
                    isReportedHtml = `<span class="tb-status text-success">Approved</span>`;
                }
                else if (post.is_reported === 2 || post.is_reported === "2") {
                    isReportedHtml = `<span class="tb-status text-danger">Rejected</span>`;
                }
                else {
                    isReportedHtml = `<span class="tb-status text-muted">Unknown</span>`;
                }
                return {
                    report_id: json.id,
                    post_id: json.post_id,
                    description: json.description,
                    post_name: post.name ?? null,
                    creator_name: user.name ?? null,
                    user_id: user.id ?? null,
                    is_reported: isReportedHtml,
                    created_at: new Date(json.created_at).toISOString().slice(0, 10), // yyyy-mm-dd
                };
            });
            return res.json({ data });
        }
        catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ status: false, message: "Server error" });
        }
    }
    // POST /reportedPost/approve
    async approveReport(req, res) {
        try {
            const { report_id } = req.body;
            if (!report_id) {
                return res.status(400).json({ message: "report_id is required" });
            }
            const report = await PostReport_1.default.findByPk(report_id);
            if (!report) {
                return res.status(404).json({ message: "Report not found" });
            }
            const post = await Post_1.default.findByPk(report.post_id);
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            post.is_reported = "1"; // enum('0','1','2') → use string
            await post.save();
            return res.json({
                status: "success",
                message: "Post Approved successfully",
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }
    }
    // POST /reportedPost/reject
    async rejectReport(req, res) {
        try {
            const { report_id } = req.body;
            if (!report_id) {
                return res.status(400).json({ message: "report_id is required" });
            }
            const report = await PostReport_1.default.findByPk(report_id);
            if (!report) {
                return res.status(404).json({ message: "Report not found" });
            }
            const post = await Post_1.default.findByPk(report.post_id);
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            post.is_reported = "2"; // string for enum column
            await post.save();
            return res.json({
                status: "success",
                message: "Post Rejected successfully",
            });
        }
        catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }
    }
    // POST /reportedPost/change-status
    async changeStatus(req, res) {
        try {
            const { id, status } = req.body;
            if (id == null) {
                return res.json({
                    status: "error",
                    message: "Invalid data",
                });
            }
            const statusNum = Number(status);
            if (!Number.isFinite(statusNum)) {
                return res.json({
                    status: "error",
                    message: "Invalid status value",
                });
            }
            // 🔴 IMPORTANT: is_reported is an ENUM('0','1','2') → use STRING
            const statusStr = statusNum.toString();
            const [affected] = await Post_1.default.update({ is_reported: statusStr }, // ✅ string, matches model/DB
            { where: { id: Number(id) } });
            if (!affected) {
                return res.json({
                    status: "error",
                    message: "Post not found or not updated",
                });
            }
            let message = "Status updated";
            if (statusNum === 0)
                message = "Pending status set successfully";
            if (statusNum === 1)
                message = "Approved status set successfully";
            if (statusNum === 2)
                message = "Rejected status set successfully";
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
}
exports.default = new ReportedPostController();
