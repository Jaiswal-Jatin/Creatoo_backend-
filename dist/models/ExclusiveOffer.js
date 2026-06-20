"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExclusiveOffer = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
class ExclusiveOffer extends sequelize_1.Model {
}
exports.ExclusiveOffer = ExclusiveOffer;
const jsonGetter = (field) => {
    return function () {
        const raw = this.getDataValue(field);
        if (!raw)
            return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return raw ? [raw] : [];
        }
    };
};
const jsonSetter = (field) => {
    return function (value) {
        if (!value || !value.length) {
            this.setDataValue(field, null);
        }
        else {
            this.setDataValue(field, JSON.stringify(value));
        }
    };
};
ExclusiveOffer.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    business_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
    },
    premium: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        get: jsonGetter("premium"),
        set: jsonSetter("premium"),
    },
    elite: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        get: jsonGetter("elite"),
        set: jsonSetter("elite"),
    },
    core: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        get: jsonGetter("core"),
        set: jsonSetter("core"),
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    sequelize: db_1.default,
    tableName: "exclusive_offers",
    timestamps: true,
});
exports.default = ExclusiveOffer;
