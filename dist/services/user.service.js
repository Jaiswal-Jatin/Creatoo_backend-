"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertCreator = exports.upsertBusiness = exports.settingsSnapshot = exports.findCreatorByMobile = exports.findBusinessByMobile = exports.userService = exports.UserService = void 0;
/**
 * Module: Backend (API Server)
 * File Purpose: User Service. Handles direct DB interactions for User/Business/Creator management.
 * Used By: UserController, AuthController
 * API Connected: N/A
 * Database Model: User, Business
 * Critical: Yes
 */
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const Business_1 = __importDefault(require("../models/Business"));
class UserService {
    async fetch(id) {
        return User_1.default.findByPk(id);
    }
    async fetchBusiness(id) {
        return Business_1.default.findByPk(id);
    }
    async fetchRecord(role, fromDate, toDate) {
        const where = {};
        if (role !== 2) {
            where.role_id = role;
        }
        if (fromDate && toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            where.createdAt = {
                [sequelize_1.Op.between]: [new Date(fromDate), endDate],
            };
        }
        if (role === 2) {
            return Business_1.default.findAll({ where, order: [["createdAt", "DESC"]] });
        }
        else {
            return User_1.default.findAll({ where, order: [["createdAt", "DESC"]] });
        }
    }
    async fetchInstagramRecord() {
        return User_1.default.findAll({
            where: {
                role_id: 3,
                is_insta_verified: { [sequelize_1.Op.ne]: 3 },
            },
            order: [["createdAt", "DESC"]],
        });
    }
    async changeStatus(id, status) {
        const isActive = status === 1;
        const [updated] = await User_1.default.update({ is_active: isActive }, { where: { id } });
        return updated > 0;
    }
    async changeBusinessStatus(id, status) {
        const isActive = status === 1;
        const [updated] = await Business_1.default.update({ is_active: isActive }, { where: { id } });
        return updated > 0;
    }
    async updateIsTop(id, isTop) {
        const [updated] = await Business_1.default.update({ is_top: Boolean(isTop) }, { where: { id } });
        return updated > 0;
    }
    async updateBusiness(id, data) {
        const [updated] = await Business_1.default.update(data, { where: { id } });
        return updated > 0;
    }
    async updateCreator(id, data) {
        const [updated] = await User_1.default.update(data, { where: { id } });
        return updated > 0;
    }
    async findBusinessByMobile(businessMobile) {
        return Business_1.default.findOne({
            where: {
                business_mobile: businessMobile,
            },
        });
    }
    async findCreatorByMobile(mobile) {
        return User_1.default.findOne({
            where: {
                mobile,
                role_id: 3,
            },
        });
    }
    async settingsSnapshot() {
        return {
            // Platform settings - these should be configured in environment or settings table
            platform_fee_percent: 0,
            gateway_charges: 0,
            reverse_gateway_charges: 0,
            min_threshold: 0,
        };
    }
    async upsertBusiness(data) {
        let business = await Business_1.default.findOne({
            where: { business_mobile: data.business_mobile },
        });
        if (business) {
            await business.update(data);
        }
        else {
            business = await Business_1.default.create(data);
        }
        return business;
    }
    async upsertCreator(data) {
        let user = await User_1.default.findOne({
            where: { mobile: data.mobile },
        });
        if (user) {
            await user.update(data);
        }
        else {
            user = await User_1.default.create(data);
        }
        return user;
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
const findBusinessByMobile = (businessMobile) => exports.userService.findBusinessByMobile(businessMobile);
exports.findBusinessByMobile = findBusinessByMobile;
const findCreatorByMobile = (mobile) => exports.userService.findCreatorByMobile(mobile);
exports.findCreatorByMobile = findCreatorByMobile;
const settingsSnapshot = () => exports.userService.settingsSnapshot();
exports.settingsSnapshot = settingsSnapshot;
const upsertBusiness = (data) => exports.userService.upsertBusiness(data);
exports.upsertBusiness = upsertBusiness;
const upsertCreator = (data) => exports.userService.upsertCreator(data);
exports.upsertCreator = upsertCreator;
