// src/controllers/UserController.ts
import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import User from "../models/User";
import { userService } from "../services/user.service";
import sequelize from "../db/sequelize";

class UserController {
  // GET single user (used by mobile, similar to User(Request $request))
  async getUser(req: Request, res: Response) {
    const { receiver } = req.body;
    const user = await User.findByPk(receiver);

    return res.json({
      status: true,
      message: "User details",
      result: { user },
    });
  }

  // GET /business/all and /creator/all
  async getAllUsers(req: Request, res: Response, role: number) {
    try {
      const { from_date, to_date } = req.query;
      const record = await userService.fetchRecord(
        role,
        from_date as string | undefined,
        to_date as string | undefined
      );

      return res.json({
        status: true,
        message: "Users list",
        role,
        data: record,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
      });
    }
  }

  // 🔍 POST /api/users/search  (Laravel: searchUser)
  async searchUser(req: Request, res: Response) {
    try {
      const { role_id, per_page } = req.body as {
        role_id?: number | string;
        per_page?: number | string;
        page?: number | string;
      };

      // Basic validation (like Laravel $request->validate)
      if (
        role_id === undefined ||
        role_id === null ||
        isNaN(Number(role_id))
      ) {
        return res.status(400).json({
          status: false,
          message: "role_id is required and must be numeric",
        });
      }

      const roleIdNum = Number(role_id);
      const perPage = per_page ? Number(per_page) : 10;
      const page = req.body.page ? Number(req.body.page) : 1;

      if (perPage < 1) {
        return res.status(400).json({
          status: false,
          message: "per_page must be at least 1",
        });
      }

      let attributes: string[] = [];

      if (roleIdNum === 2) {
        // BUSINESS
        attributes = [
          "id",
          "business_fullname",
          "business_name",
          "business_email",
          "business_mobile",
          "business_area",
          "business_site_url",
          "business_image",
          "is_active",
          "role_id",
          "pricing_range_text",
          "set_first_time_discount",
          "set_regular_discount",
        ];
      } else if (roleIdNum === 3) {
        // CREATOR
        attributes = [
          "id",
          "name",
          "email",
          "mobile",
          "instagram_link",
          "instagram_username",
          "user_image",
          "bio",
          "is_insta_verified",
          "is_active",
          "role_id",
        ];
      } else {
        // same as Laravel: no users for other roles
        return res.status(200).json({
          status: true,
          message: "No users found with this role ID",
          data: [],
        });
      }

      const offset = (page - 1) * perPage;

      const { rows, count } = await User.findAndCountAll({
        where: { role_id: roleIdNum },
        attributes,
        limit: perPage,
        offset,
        order: [["id", "DESC"]],
      });

      if (count === 0) {
        return res.status(200).json({
          status: true,
          message: "No users found with this role ID",
          data: [],
        });
      }

      // Add avg_experience from reviews table (like Laravel DB::table('reviews')...)
      const usersWithRatings = await Promise.all(
        rows.map(async (user: any) => {
          const [ratingResult]: any = await sequelize.query(
            `
            SELECT ROUND(AVG(experience), 1) as avg_experience
            FROM reviews
            WHERE business_id = :businessId
          `,
            {
              replacements: { businessId: user.id },
              type: QueryTypes.SELECT,
            }
          );

          const avg_experience =
            ratingResult && ratingResult.avg_experience !== null
              ? Number(ratingResult.avg_experience)
              : null;

          return {
            ...user.toJSON(),
            avg_experience,
          };
        })
      );

      const lastPage = Math.ceil(count / perPage);

      return res.status(200).json({
        status: true,
        message: "Search results retrieved successfully",
        data: usersWithRatings,
        pagination: {
          current_page: page,
          last_page: lastPage,
          per_page: perPage,
          total: count,
        },
      });
    } catch (e) {
      console.error("searchUser error:", e);
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
      });
    }
  }

  // 🔍 POST /api/users/searchBusinessAndCreator (Laravel: searchBusinessAndCreator)
  async searchBusinessAndCreator(req: Request, res: Response) {
    try {
      const { key, role_id, page } = req.body as {
        key?: string;
        role_id?: number | string;
        page?: number | string;
      };

      const searchKey = key?.trim();
      const roleIdRaw = role_id;
      const currentPage = page ? Number(page) : 1;
      const perPage = 10;

      if (!searchKey || !roleIdRaw) {
        return res.status(400).json({
          status: false,
          message: "Search key and role ID are required",
        });
      }

      const roleId = Number(roleIdRaw);
      if (Number.isNaN(roleId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid role ID",
        });
      }

      let attributes: string[] = [];
      let where: any = {
        role_id: roleId,
      };

      if (roleId === 2) {
        // BUSINESS
        attributes = [
          "id",
          "business_fullname",
          "business_name",
          "business_email",
          "business_mobile",
          "business_area",
          "business_site_url",
          "business_image",
          "is_active",
          "role_id",
          "pricing_range_text",
          "set_first_time_discount",
          "set_regular_discount",
        ];

        where = {
          ...where,
          [Op.or]: [
            { name: { [Op.like]: `%${searchKey}%` } },
            { business_name: { [Op.like]: `%${searchKey}%` } },
            { business_fullname: { [Op.like]: `%${searchKey}%` } },
          ],
        };
      } else if (roleId === 3) {
        // CREATOR
        attributes = [
          "id",
          "name",
          "email",
          "mobile",
          "instagram_link",
          "instagram_username",
          "user_image",
          "bio",
          "is_active",
          "role_id",
        ];

        where = {
          ...where,
          [Op.or]: [
            { name: { [Op.like]: `%${searchKey}%` } },
            { instagram_username: { [Op.like]: `%${searchKey}%` } },
          ],
        };
      } else {
        return res.status(400).json({
          status: false,
          message: "Invalid role ID",
        });
      }

      const offset = (currentPage - 1) * perPage;

      const { rows, count } = await User.findAndCountAll({
        where,
        attributes,
        limit: perPage,
        offset,
        order: [["id", "DESC"]],
      });

      if (count === 0) {
        return res.status(200).json({
          status: true,
          message: "No results found for the provided search key",
          data: [],
        });
      }

      // Global average experience (like your Laravel code)
      const [ratingRow]: any = await sequelize.query(
        `SELECT ROUND(AVG(experience), 1) as avg_experience FROM reviews`,
        { type: QueryTypes.SELECT }
      );

      const avgExperience =
        ratingRow && ratingRow.avg_experience !== null
          ? Number(ratingRow.avg_experience)
          : null;

      // Attach avg_experience to each result
      const updatedResults = rows.map((user) => {
        const plain = user.toJSON() as any;
        plain.avg_experience = avgExperience;
        return plain;
      });

      const lastPage = Math.ceil(count / perPage);

      return res.status(200).json({
        status: true,
        message: "Search results retrieved successfully",
        data: updatedResults,
        pagination: {
          current_page: currentPage,
          last_page: lastPage,
          per_page: perPage,
          total: count,
        },
      });
    } catch (e) {
      console.error("searchBusinessAndCreator error:", e);
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
      });
    }
  }

  // POST /api/auth/viewProfile   (Laravel: viewProfile)
  async viewProfile(req: Request, res: Response) {
    try {
      const { role_id, id, callInstaApi } = req.body as {
        role_id?: number | string;
        id?: number | string;
        callInstaApi?: number | string;
      };

      // validation
      if (
        role_id === undefined ||
        role_id === null ||
        isNaN(Number(role_id)) ||
        id === undefined ||
        id === null
      ) {
        return res.status(400).json({
          status: false,
          message: "role_id and id are required",
          data: [],
        });
      }

      const roleId = Number(role_id);
      const userId = Number(id);
      const flag = callInstaApi ? Number(callInstaApi) : 0;

      let attributes: string[] = [];
      let userRecord: User | null = null;

      if (roleId === 2) {
        // BUSINESS PROFILE
        attributes = [
          "id",
          "business_fullname",
          "business_name",
          "business_email",
          "business_mobile",
          "business_address",
          "business_area",
          "business_site_url",
          "business_image",
          "gst_number",
          "business_designation",
          "is_active",
          "role_id",
          "time_from",
          "time_to",
          "pricing_range_text",
          "menu_card_1",
          "menu_card_2",
          "menu_card_3",
          "menu_card_4",
          "menu_card_5",
          "business_image_1",
          "business_image_2",
          "business_image_3",
          "business_image_4",
          "business_image_5",
          "set_first_time_discount",
          "set_regular_discount",
          "min_order",
          "set_expiry",
        ];

        userRecord = await User.findOne({
          where: { role_id: roleId, id: userId },
          attributes,
        });
      } else if (roleId === 3) {
        // CREATOR PROFILE
        attributes = [
          "id",
          "name",
          "email",
          "mobile",
          "address",
          "instagram_link",
          "instagram_username",
          "user_image",
          "is_active",
          "role_id",
          "instagram_fullname",
          "follower_count",
          "following_count",
          "media_count",
          "bio",
          "engagement_rate",
          "avg_likes",
          "avg_comments",
          "avg_activity",
          "is_insta_verified",
          "verification_note",
          "updatedAt",
        ];

        userRecord = await User.findOne({
          where: { role_id: roleId, id: userId },
          attributes,
        });
      } else {
        return res.status(400).json({
          status: false,
          message: "Invalid role ID",
          data: [],
        });
      }

      if (!userRecord) {
        return res.status(200).json({
          status: true,
          message: "No users found with this role ID",
          data: [],
        });
      }

      let user = userRecord.toJSON() as any;

      // Extra data for BUSINESS (role_id = 2)
      if (roleId === 2) {
        const [countRow]: any = await sequelize.query(
          `
          SELECT COUNT(*) AS total_reviews
          FROM reviews
          WHERE business_id = :businessId
        `,
          {
            replacements: { businessId: userId },
            type: QueryTypes.SELECT,
          }
        );

        const totalReviews = countRow?.total_reviews
          ? Number(countRow.total_reviews)
          : 0;

        let averageRatingsData: any = null;

        if (totalReviews > 0) {
          const [avgRow]: any = await sequelize.query(
            `
            SELECT 
              ROUND(AVG(experience), 1) AS avg_experience,
              ROUND(AVG(expectation), 1) AS avg_expectation,
              ROUND(AVG(interaction), 1) AS avg_interaction,
              CONCAT(ROUND(AVG(recommend) * 20, 0), '%') AS avg_recommend,
              CONCAT(ROUND(AVG(fair_money) * 20, 0), '%') AS avg_fair_money
            FROM reviews
            WHERE business_id = :businessId
          `,
            {
              replacements: { businessId: userId },
              type: QueryTypes.SELECT,
            }
          );

          averageRatingsData = {
            avg_experience:
              avgRow && avgRow.avg_experience !== null
                ? String(avgRow.avg_experience)
                : "0",
            avg_expectation:
              avgRow && avgRow.avg_expectation !== null
                ? String(avgRow.avg_expectation)
                : "0",
            avg_interaction:
              avgRow && avgRow.avg_interaction !== null
                ? String(avgRow.avg_interaction)
                : "0",
            avg_recommend:
              avgRow && avgRow.avg_recommend !== null
                ? avgRow.avg_recommend
                : "0%",
            avg_fair_money:
              avgRow && avgRow.avg_fair_money !== null
                ? avgRow.avg_fair_money
                : "0%",
          };
        }

        const reviewRows: any[] = (await sequelize.query(
          `
          SELECT review_text
          FROM reviews
          WHERE business_id = :businessId
            AND review_text IS NOT NULL
        `,
          {
            replacements: { businessId: userId },
            type: QueryTypes.SELECT,
          }
        )) as any[];

        const review_text = reviewRows.map((r) => r.review_text);

        user = {
          ...user,
          average_ratings: averageRatingsData,
          total_reviews: totalReviews,
          review_text,
        };
      }

      // Optional Instagram refresh for creator
      if (
        roleId === 3 &&
        flag === 1 &&
        user.instagram_username &&
        user.id
      ) {
        // Here you could call a service to refresh Instagram data if you want.
        // Example (implement in userService if needed):
        // await userService.updateInstagramDataForUser(user.instagram_username, user.id);

        const updated = await User.findOne({
          where: { role_id: roleId, id: userId },
          attributes: [
            "id",
            "name",
            "email",
            "mobile",
            "address",
            "instagram_link",
            "instagram_username",
            "user_image",
            "is_active",
            "role_id",
            "instagram_fullname",
            "follower_count",
            "following_count",
            "media_count",
            "bio",
            "engagement_rate",
            "avg_likes",
            "avg_comments",
            "avg_activity",
            "is_insta_verified",
            "verification_note",
            "updatedAt",
          ],
        });

        if (updated) {
          user = updated.toJSON();
        }
      }

      return res.json({
        status: true,
        message: "User profile found successfully.",
        data: user,
      });
    } catch (e) {
      console.error("viewProfile error:", e);
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
        data: [],
      });
    }
  }

  // POST /update-is-top
  async updateIsTop(req: Request, res: Response) {
    const { id, is_top } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "id required" });
    }

    const success = await userService.updateIsTop(
      Number(id),
      Boolean(Number(is_top))
    );

    if (success) return res.json({ success: true });

    return res.status(400).json({ success: false });
  }

  // POST business/change-status & creator/change-status
  async changeStatus(req: Request, res: Response) {
    const { id, status } = req.body;

    if (!id || status === undefined) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Data" });
    }

    const success = await userService.changeStatus(Number(id), Number(status));

    if (!success) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Data" });
    }

    const message =
      Number(status) === 1
        ? "Active status change successfully"
        : "Inactive status change successfully";

    return res.json({ status: "success", message });
  }

  // GET business/edit/:id
  async getEditBusiness(req: Request, res: Response) {
    const { id } = req.params;
    const data = await userService.fetch(Number(id));

    if (!data) {
      return res
        .status(404)
        .json({ status: false, message: "Business not found" });
    }

    return res.json({ status: true, data });
  }

  // POST business/edit/:id
  async updateBusiness(req: Request, res: Response) {
    const { id } = req.params;
    const payload = req.body; // handle file uploads separately using multer

    const success = await userService.updateBusiness(Number(id), payload);

    if (success) {
      return res.json({
        status: true,
        message: "Business details updated successfully.",
      });
    }

    return res
      .status(400)
      .json({ status: false, message: "Failed to update business details." });
  }

  // GET creator/edit/:id
  async getEditCreator(req: Request, res: Response) {
    const { id } = req.params;
    const data = await userService.fetch(Number(id));

    if (!data) {
      return res
        .status(404)
        .json({ status: false, message: "Creator not found" });
    }

    return res.json({ status: true, data });
  }

  // POST creator/edit/:id
  async updateCreator(req: Request, res: Response) {
    const { id } = req.params;
    const payload = req.body; // again, file upload can be handled with multer

    const success = await userService.updateCreator(Number(id), payload);

    if (success) {
      return res.json({
        status: true,
        message: "Creator details updated successfully.",
      });
    }

    return res
      .status(400)
      .json({ status: false, message: "Failed to update creator details." });
  }

  // GET /creator/instagram
  async getInstagramUsers(req: Request, res: Response) {
    try {
      const record = await userService.fetchInstagramRecord();
      return res.json({
        status: true,
        message: "Instagram creators list",
        data: record,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
      });
    }
  }

  // GET creator/editInstagram/:id
  async getEditInstagram(req: Request, res: Response) {
    const { id } = req.params;
    const data = await userService.fetch(Number(id));

    if (!data) {
      return res
        .status(404)
        .json({ status: false, message: "Creator not found" });
    }

    return res.json({ status: true, data });
  }

  // POST creator/editInstagram/:id
  // NOTE: this is the simplified version; you can plug in your RapidAPI calls
  async updateInstagram(req: Request, res: Response) {
    const { id } = req.params;
    const { instagram_username, is_insta_verified, verification_note } =
      req.body;

    if (!instagram_username || is_insta_verified === undefined) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid data provided" });
    }

    const dataToUpdate: any = {
      instagram_username,
      is_insta_verified,
    };

    if (Number(is_insta_verified) === 2) {
      dataToUpdate.verification_note = verification_note;
    }

    const [updated] = await User.update(dataToUpdate, {
      where: { id: Number(id) },
    });

    if (updated > 0) {
      return res.json({
        status: true,
        message: "Creator Instagram details updated successfully.",
      });
    }

    return res
      .status(400)
      .json({ status: false, message: "Failed to update Instagram details." });
  }

  // POST /api/users/inactiveUser  (Laravel: inactiveUser)
  async inactiveUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized user",
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "User not found",
        });
      }

      await user.update({ is_active: false });

      return res.json({
        status: true,
        message: "Your account deleted successfully.",
      });
    } catch (error) {
      console.error("inactiveUser error:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
      });
    }
  }
}

export const userController = new UserController();
