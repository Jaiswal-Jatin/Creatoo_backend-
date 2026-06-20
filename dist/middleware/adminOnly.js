"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const admin_service_1 = __importDefault(require("../services/admin.service"));
const adminService = new admin_service_1.default();
const adminOnly = async (req, res, next) => {
    const user = req.user;
    if (!user || !user.id) {
        return res.status(401).json({
            status: false,
            message: 'Unauthorized',
        });
    }
    // If token already has role=admin, allow immediately
    if (user.role === 'admin') {
        return next();
    }
    try {
        // Fallback: check if this ID exists in admins table
        const admin = await adminService.findById(user.id);
        if (!admin) {
            return res.status(403).json({
                status: false,
                message: 'Access denied: Admins only',
            });
        }
        // Attach role so downstream handlers know
        req.user = { ...user, role: 'admin' };
        return next();
    }
    catch (err) {
        console.error('adminOnly error:', err);
        return res.status(500).json({
            status: false,
            message: 'Internal server error',
        });
    }
};
exports.adminOnly = adminOnly;
