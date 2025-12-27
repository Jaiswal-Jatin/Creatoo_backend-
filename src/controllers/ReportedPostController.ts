// src/controllers/ReportedPostController.ts
import { Request, Response } from "express";
import { Op } from "sequelize";
import User from "../models/User";
import Post from "../models/Post";
import PostReport from "../models/PostReport";
import reportedPostService from "../services/reportedPost.service";

class ReportedPostController {
  // GET /reportedPost/all
  async getAllReportedPostService(req: Request, res: Response) {
    try {
      const records = await reportedPostService.fetchRecord();

      // Filter only posts where user role_id == 3 (creator)
      const dataPromises = records.map(async (record: any) => {
        const user = await User.findByPk(record.user_id);
        if (!user || user.role_id !== 3) return null;

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
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: false, message: "Server error" });
    }
  }

  // GET /reportedPost/getUserReportedPost
  async getUserReportedPost(req: Request, res: Response) {
    try {
      const { from_date, to_date } = req.query as {
        from_date?: string;
        to_date?: string;
      };

      const where: any = {};

      if (from_date && to_date) {
        const fromDate = new Date(from_date);
        const toDate = new Date(to_date);
        toDate.setHours(23, 59, 59, 999);

        where.created_at = { [Op.between]: [fromDate, toDate] };
      }

      const reports = await PostReport.findAll({
        where,
        include: [
          {
            model: Post,
            as: "post",
            attributes: ["id", "name", "is_reported"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const data = reports.map((r: any) => {
        const json = r.toJSON();
        const post = json.post || {};
        const user = json.user || {};

        let isReportedHtml = "";
        if (post.is_reported === 0 || post.is_reported === "0") {
          isReportedHtml = `<span class="tb-status text-warning cursor-pointer" onclick="showApprovalPopup(${json.id})" style="cursor:pointer;">Pending</span>`;
        } else if (post.is_reported === 1 || post.is_reported === "1") {
          isReportedHtml = `<span class="tb-status text-success">Approved</span>`;
        } else if (post.is_reported === 2 || post.is_reported === "2") {
          isReportedHtml = `<span class="tb-status text-danger">Rejected</span>`;
        } else {
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
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ status: false, message: "Server error" });
    }
  }

  // POST /reportedPost/approve
  async approveReport(req: Request, res: Response) {
    try {
      const { report_id } = req.body as { report_id?: number };

      if (!report_id) {
        return res.status(400).json({ message: "report_id is required" });
      }

      const report: any = await PostReport.findByPk(report_id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const post = await Post.findByPk(report.post_id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      (post as any).is_reported = "1"; // enum('0','1','2') → use string
      await post.save();

      return res.json({
        status: "success",
        message: "Post Approved successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // POST /reportedPost/reject
  async rejectReport(req: Request, res: Response) {
    try {
      const { report_id } = req.body as { report_id?: number };

      if (!report_id) {
        return res.status(400).json({ message: "report_id is required" });
      }

      const report: any = await PostReport.findByPk(report_id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const post = await Post.findByPk(report.post_id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      (post as any).is_reported = "2"; // string for enum column
      await post.save();

      return res.json({
        status: "success",
        message: "Post Rejected successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // POST /reportedPost/change-status
  async changeStatus(req: Request, res: Response) {
    try {
      const { id, status } = req.body as {
        id?: number | string;
        status?: number | string;
      };

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

      const [affected] = await Post.update(
        { is_reported: statusStr }, // ✅ string, matches model/DB
        { where: { id: Number(id) } }
      );

      if (!affected) {
        return res.json({
          status: "error",
          message: "Post not found or not updated",
        });
      }

      let message = "Status updated";
      if (statusNum === 0) message = "Pending status set successfully";
      if (statusNum === 1) message = "Approved status set successfully";
      if (statusNum === 2) message = "Rejected status set successfully";

      return res.json({
        status: "success",
        message,
      });
    } catch (err) {
      console.error(err);
      return res.json({
        status: "error",
        message: "Something went wrong",
      });
    }
  }
}

export default new ReportedPostController();
