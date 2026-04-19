/**
 * Module: Backend (API Server)
 * File Purpose: Banner Controller. Handles CRUD and status management for app banners.
 * Used By: Admin Panel
 * API Connected: /api/banner/*
 * Database Model: Banner (via BannerService)
 * Critical: Yes
 * Notes: Includes image compression and dynamic status updates.
 */
import { Request, Response } from "express";
import path from "path";
import BannerService from "../services/banner.service";
import { deleteIfExists, saveCompressedImage } from "../services/storage.service";

const service = new BannerService();

// (Optional) helper if you ever store absolute paths again
const toPublic = (absPath: string) => {
  const rel = path.relative(process.cwd(), absPath).split(path.sep).join("/");
  return `/${rel}`;
};

export default {
  // GET /banner/all
  async getAllBannerService(req: Request, res: Response) {
    try {
      const draw = Number(req.query.draw || 1);
      const records = await service.fetchRecord();

      const data = records.map((rec: any) => ({
        id: rec.id,
        image: rec.image,          // e.g. "public/images/xxx.png"
        is_active: rec.is_active ? 1 : 0,
        link: rec.link ?? "#",
      }));

      return res.json({
        draw,
        recordsTotal: records.length,
        recordsFiltered: records.length,
        data,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        draw: 1,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        message: "Internal Server Error",
      });
    }
  },

  // GET /banner/add
  bannerView(_req: Request, res: Response) {
    res.json({ message: "Render 'banner.add' page in your front-end." });
  },

  // POST /banner/add
  async addBanner(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(422).json({ message: "image is required" });
      }
      if (!req.body.link) {
        return res.status(422).json({ message: "link is required" });
      }

      // ✅ Compress and move to public/images with random name
      const { filePath, fileUrl } = await saveCompressedImage(req.file);
      // filePath: absolute path on disk
      // fileUrl : "public/images/xxxx.png"  ← store this in DB (what you wanted)

      const banner = await service.create({
        image: fileUrl,
        link: req.body.link,
      });

      return res.status(201).json({
        message: "Banner added successfully",
        banner,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // GET /banner/edit/:id
  async getEditBanner(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = await service.fetch(id);
    if (!data) return res.status(404).json({ message: "Banner not found" });
    return res.json({ data });
  },

  // POST /banner/edit/:id
  async updateBanner(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const existing = await service.findById(id);
      if (!existing) {
        return res.status(404).json({ message: "Banner not found" });
      }

      let imagePath: string | undefined;

      if (req.file) {
        // delete old image (existing.image is "public/images/xxx.png")
        deleteIfExists(existing.image);

        // compress new one & get new relative path
        const { fileUrl } = await saveCompressedImage(req.file);
        imagePath = fileUrl; // again "public/images/xxxx.png"
      }

      const payload: any = {};
      if (typeof imagePath !== "undefined") payload.image = imagePath;
      if (typeof req.body.link !== "undefined") payload.link = req.body.link;

      const updated = await service.editBanner(id, payload);
      return res.json({
        message: "Banner updated successfully",
        banner: updated,
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ message: err.message || "Something went wrong" });
    }
  },

  // GET /banner/delete/:id
  async deleteBanner(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await service.delete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Banner not found" });
    }

    // deleted.image is "public/images/xxx.png"
    deleteIfExists(deleted.image);

    return res.json({ message: "Banner deleted successfully" });
  },

  // POST /banner/change-status
  async changeStatus(req: Request, res: Response) {
    const { id, status } = req.body || {};
    if (typeof id === "undefined" || typeof status === "undefined") {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Data" });
    }

    const [affected] = await service.changeStatus(
      Number(id),
      Number(status)
    );

    if (affected > 0) {
      const message =
        Number(status) === 1
          ? "Active status change successfully"
          : "Inactive status change successfully";
      return res.json({ status: "success", message });
    }

    return res
      .status(404)
      .json({ status: "error", message: "Banner not found" });
  },
};
