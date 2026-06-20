"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const turf_routes_1 = __importDefault(require("./turf.routes"));
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json({ status: true, message: 'Creatoo API is running 🚀' });
});
router.get('/categories', (_req, res) => {
    res.json({
        status: true,
        message: "Categories fetched successfully",
        data: [
            {
                id: "restaurant",
                name: "Restaurant",
                icon: "restaurant",
                color: "0xFFFF5722",
                description: "Cafes, Fine dining, Quick bites, Fast food"
            },
            {
                id: "salon",
                name: "Salon & Spa",
                icon: "content_cut",
                color: "0xFFE91E63",
                description: "Salons, Spas, Beauty parlors, Stylists"
            },
            {
                id: "turf",
                name: "Turf",
                icon: "sports_soccer",
                color: "0xFF4CAF50",
                description: "Sports turfs, Grounds, Play arenas"
            }
        ]
    });
});
router.use('/auth', auth_routes_1.default);
router.use('/turf', turf_routes_1.default);
exports.default = router;
