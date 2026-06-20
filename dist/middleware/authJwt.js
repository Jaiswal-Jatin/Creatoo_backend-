"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
const authJwt = async (req, res, next) => {
    const hdr = req.headers.authorization;
    const token = hdr?.startsWith('Bearer ')
        ? hdr.slice(7)
        : req.body.token;
    if (!token) {
        return res.status(401).json({ status: false, message: 'No token' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET);
        // If token lacks role_id, dynamically look up the user/business to resolve it
        if (decoded.role_id === undefined) {
            // 1. Try finding in users table
            const user = await User_1.default.findByPk(decoded.id, { attributes: ['id', 'role_id'] });
            if (user) {
                decoded.role_id = user.role_id || undefined;
            }
            else {
                // 2. Try finding in businesses table
                const business = await Business_1.default.findByPk(decoded.id, { attributes: ['id', 'role_id'] });
                if (business) {
                    decoded.role_id = 2; // Business role_id is 2
                }
            }
        }
        if (decoded.role_id === undefined) {
            return res.status(401).json({ status: false, message: 'User or Business not found' });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error('authJwt error:', err);
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ status: false, message: 'Token expired' });
        }
        else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ status: false, message: 'Invalid token signature' });
        }
        else {
            return res.status(401).json({ status: false, message: 'Token verification failed' });
        }
    }
};
exports.authJwt = authJwt;
