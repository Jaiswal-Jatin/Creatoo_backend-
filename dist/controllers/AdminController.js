"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
const admin_service_1 = __importDefault(require("../services/admin.service"));
const service = new admin_service_1.default();
exports.default = {
    /**
     * Function: login()
     * Role: Admin
     * Description: Authenticates Admin using email & password.
     * Params: email (string), password (string)
     * Returns: JWT token and Admin details
     * Used: Yes
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res
                    .status(422)
                    .json({ status: false, message: 'Email and password are required' });
            }
            const admin = await service.findByEmail(email);
            if (!admin) {
                return res.status(401).json({ status: false, message: 'Invalid credentials' });
            }
            const matched = await bcryptjs_1.default.compare(password, admin.password);
            if (!matched) {
                return res.status(401).json({ status: false, message: 'Invalid credentials' });
            }
            // Generate JWT token WITH ROLE
            const payload = { id: admin.id, role: 'admin' };
            const token = jsonwebtoken_1.default.sign(payload, env_1.default.JWT_SECRET, { expiresIn: '1d' });
            return res.json({
                status: true,
                message: 'Login successful',
                token,
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                },
            });
        }
        catch (err) {
            console.error('Admin login error:', err);
            return res.status(500).json({
                status: false,
                message: err.message || 'Something went wrong',
            });
        }
    },
    /**
     * Function: changePassword()
     * Role: Admin
     * Description: Updates Admin password after verifying current password.
     * Params: current_password, new_password, confirm_password
     * Returns: Success message
     * Used: Yes
     */
    async changePassword(req, res) {
        try {
            const user = req.user;
            if (!user?.id) {
                return res.status(401).json({ status: false, message: 'Unauthorized' });
            }
            const { current_password, new_password, confirm_password } = req.body;
            if (!current_password || !new_password || !confirm_password) {
                return res.status(422).json({
                    status: false,
                    message: 'current_password, new_password and confirm_password are required',
                });
            }
            if (new_password !== confirm_password) {
                return res.status(422).json({
                    status: false,
                    message: 'New password and confirm password do not match',
                });
            }
            const admin = await service.findById(user.id);
            if (!admin) {
                return res.status(404).json({ status: false, message: 'Admin not found' });
            }
            const matched = await bcryptjs_1.default.compare(current_password, admin.password);
            if (!matched) {
                return res.status(401).json({
                    status: false,
                    message: 'Current password is incorrect',
                });
            }
            const hashed = await bcryptjs_1.default.hash(new_password, 10);
            await service.updatePassword(admin.id, hashed);
            return res.json({
                status: true,
                message: 'Password updated successfully',
            });
        }
        catch (err) {
            console.error('Admin changePassword error:', err);
            return res.status(500).json({
                status: false,
                message: err.message || 'Something went wrong',
            });
        }
    },
    /**
     * Function: me()
     * Role: Admin
     * Description: Retrieves current Admin profile.
     * Params: None (from token)
     * Returns: Admin details
     * Used: Yes
     */
    async me(req, res) {
        const user = req.user;
        if (!user?.id) {
            return res.status(401).json({ status: false, message: 'Unauthorized' });
        }
        const admin = await service.findById(user.id);
        if (!admin) {
            return res.status(404).json({ status: false, message: 'Admin not found' });
        }
        return res.json({
            status: true,
            data: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
            },
        });
    },
};
