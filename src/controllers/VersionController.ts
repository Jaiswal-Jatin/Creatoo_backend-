/**
 * Module: Backend (API Server)
 * File Purpose: Version Controller. Handles app version verification to enforce updates.
 * Used By: User Mobile App, Business Admin App
 * API Connected: /api/version/*
 * Database Model: Version
 * Critical: Yes (Delivery/UX)
 */
import { Request, Response } from "express";
import Version from "../models/Version";

interface AuthUser {
  id: number;
  is_admin?: boolean;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

class VersionController {
  // ✅ POST /api/version/verify
  // Body: { version: "1.0.0" }
  // Compares client version with latest active version
  async verify(req: Request, res: Response) {
    try {
      const { version } = req.body as { version?: string };

      if (!version) {
        return res.status(422).json({
          status: false,
          message: "version is required",
        });
      }

      // Get latest active version (highest id with status = 1)
      const latest = await Version.findOne({
        where: { status: 1 },
        order: [["id", "DESC"]],
      });

      if (!latest) {
        return res.status(200).json({
          status: true,
          message: "No version info configured",
          needs_update: false,
        });
      }

      const clientVersion = version.trim();
      const latestVersion = latest.version.trim();

      const needsUpdate = clientVersion !== latestVersion;

      return res.status(200).json({
        status: true,
        needs_update: needsUpdate,
        client_version: clientVersion,
        latest_version: latestVersion,
        message: latest.message,
      });
    } catch (e: any) {
      console.error("version verify error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // ✅ GET /api/version/latest
  // Returns latest active version
  async latest(req: Request, res: Response) {
    try {
      const latest = await Version.findOne({
        where: { status: 1 },
        order: [["id", "DESC"]],
      });

      if (!latest) {
        return res.status(404).json({
          status: false,
          message: "No active version found",
        });
      }

      return res.status(200).json({
        status: true,
        data: {
          id: latest.id,
          version: latest.version,
          message: latest.message,
          status: latest.status,
        },
      });
    } catch (e: any) {
      console.error("version latest error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // ✅ ADMIN ONLY
  // POST /api/version
  // Body: { version: "1.0.1", message: "Bug fixes", status: 1 }
  async create(req: AuthRequest, res: Response) {
    try {
      
      const { version, message, status } = req.body as {
        version?: string;
        message?: string;
        status?: number;
      };

      if (!version || !message) {
        return res.status(422).json({
          status: false,
          message: "version and message are required",
        });
      }

      const newVersion = await Version.create({
        version,
        message,
        status: typeof status === "number" ? status : 1,
      });

      return res.status(201).json({
        status: true,
        message: "Version created successfully",
        data: newVersion,
      });
    } catch (e: any) {
      console.error("version create error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }

  // ✅ ADMIN ONLY
  // PUT /api/version/:id
  // Body: { version?, message?, status? }
  async update(req: AuthRequest, res: Response) {
    try {

      const { id } = req.params;
      const versionId = Number(id);

      if (Number.isNaN(versionId)) {
        return res.status(422).json({
          status: false,
          message: "id must be numeric",
        });
      }

      const { version, message, status } = req.body as {
        version?: string;
        message?: string;
        status?: number;
      };

      const record = await Version.findByPk(versionId);

      if (!record) {
        return res.status(404).json({
          status: false,
          message: "Version not found",
        });
      }

      if (version !== undefined) record.version = version;
      if (message !== undefined) record.message = message;
      if (status !== undefined) record.status = status;

      await record.save();

      return res.status(200).json({
        status: true,
        message: "Version updated successfully",
        data: record,
      });
    } catch (e: any) {
      console.error("version update error:", e);
      return res.status(500).json({
        status: false,
        message: "Server error: " + e.message,
      });
    }
  }
}

export default new VersionController();
