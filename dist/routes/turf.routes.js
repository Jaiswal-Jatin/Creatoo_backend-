"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TurfOption_1 = __importDefault(require("../models/TurfOption"));
const router = (0, express_1.Router)();
router.get('/options', async (_req, res) => {
    try {
        const options = await TurfOption_1.default.findAll({
            order: [['type', 'ASC'], ['sort_order', 'ASC'], ['value', 'ASC']],
        });
        const grouped = {};
        for (const opt of options) {
            const t = opt.type;
            if (!grouped[t])
                grouped[t] = [];
            grouped[t].push(opt.value);
        }
        return res.json({
            status: true,
            message: 'Turf options fetched successfully',
            data: grouped,
        });
    }
    catch (err) {
        console.error('Error fetching turf options:', err);
        return res.status(500).json({ status: false, message: 'Failed to fetch turf options' });
    }
});
exports.default = router;
