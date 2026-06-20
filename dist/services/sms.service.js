"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = __importDefault(require("../config/env"));
const sendOtp = async (mobile, otp) => {
    if (!env_1.default.MSG91_AUTHKEY || !env_1.default.MSG91_TEMPLATE_ID_LOGIN) {
        console.log(`[DEV] OTP for ${mobile}: ${otp} (MSG91 not configured)`);
        return;
    }
    const msisdn = mobile.startsWith('91') ? mobile : `91${mobile}`;
    const payload = {
        template_id: env_1.default.MSG91_TEMPLATE_ID_LOGIN,
        sender: env_1.default.MSG91_SENDER_ID,
        short_url: '0',
        recipients: [{ mobiles: msisdn, var1: otp }],
    };
    try {
        const resp = await axios_1.default.post('https://api.msg91.com/api/v5/flow', payload, {
            headers: { authkey: env_1.default.MSG91_AUTHKEY, 'Content-Type': 'application/json' },
            timeout: 15000,
        });
        if (resp.status < 200 || resp.status >= 300) {
            console.error('MSG91 non-2xx:', resp.status, resp.statusText, JSON.stringify(resp.data));
        }
        else {
            console.log('MSG91 response:', JSON.stringify(resp.data));
        }
    }
    catch (err) {
        console.error('MSG91 sendOtp failed:', err?.response?.status, JSON.stringify(err?.response?.data || err?.message));
    }
};
exports.sendOtp = sendOtp;
