"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.exchangeCodeForToken = exports.getAuthUrl = void 0;
/**
 * Module: Backend (API Server)
 * File Purpose: Instagram Service. Facilitates OAuth and profile retrieval from the Instagram Graph API.
 * Used By: AuthController, UserController
 * Database Model: N/A
 * Critical: Yes (Auth/Integration)
 */
const axios_1 = __importDefault(require("axios"));
const env_1 = __importDefault(require("../config/env"));
const getAuthUrl = () => {
    const params = new URLSearchParams({
        client_id: env_1.default.INSTAGRAM_CLIENT_ID,
        redirect_uri: env_1.default.INSTAGRAM_REDIRECT_URI,
        scope: 'user_profile',
        response_type: 'code'
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
};
exports.getAuthUrl = getAuthUrl;
const exchangeCodeForToken = async (code) => {
    const data = new URLSearchParams({
        client_id: env_1.default.INSTAGRAM_CLIENT_ID,
        client_secret: env_1.default.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: env_1.default.INSTAGRAM_REDIRECT_URI,
        code
    });
    const res = await axios_1.default.post('https://api.instagram.com/oauth/access_token', data);
    return res.data;
};
exports.exchangeCodeForToken = exchangeCodeForToken;
const getProfile = async (userId, accessToken) => {
    const url = `https://graph.instagram.com/${userId}?fields=id,username&access_token=${accessToken}`;
    const res = await axios_1.default.get(url);
    return res.data;
};
exports.getProfile = getProfile;
