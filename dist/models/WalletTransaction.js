"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("./User"));
class WalletTransaction extends sequelize_1.Model {
}
// Override toJSON to convert null strings to empty strings for Flutter null-safety compatibility
WalletTransaction.prototype.toJSON = function () {
    const obj = this.get();
    const safe = {};
    const stringFields = ['remark', 'via', 'receipt_image', 'is_withdraw_request', 'source_type', 'settlement_status', 'credit_debit'];
    for (const [key, val] of Object.entries(obj)) {
        safe[key] = stringFields.includes(key) && (val === null || val === undefined) ? '' : val;
    }
    return safe;
};
WalletTransaction.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    credit_debit: {
        type: sequelize_1.DataTypes.ENUM('credit', 'debit'),
        allowNull: false,
    },
    remark: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    is_withdraw_request: {
        type: sequelize_1.DataTypes.ENUM('0', '1'),
        defaultValue: '0',
    },
    via: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    receipt_image: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    settlement_status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'settled'),
        defaultValue: 'pending',
    },
    settled_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    settlement_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    source_type: {
        type: sequelize_1.DataTypes.ENUM('order_payment', 'advance_payment', 'manual_payment'),
        allowNull: true,
    },
    from_user_id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
}, {
    sequelize: db_1.default,
    tableName: 'wallet_transactions',
    underscored: true,
    timestamps: true,
});
// Relation like Laravel: $this->belongsTo(User::class)
WalletTransaction.belongsTo(User_1.default, {
    foreignKey: 'user_id',
    as: 'user',
});
exports.default = WalletTransaction;
