"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Business = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
/**
 * Class: Business
 * Role: Business users
 * Description: Sequelize Model for the 'businesses' table.
 */
class Business extends sequelize_1.Model {
}
exports.Business = Business;
Business.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_qr_id: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_fullname: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    mobile: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    email: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_email: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_address: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_area: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_site_url: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_designation: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    gst_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_type_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    business_category: {
        type: sequelize_1.DataTypes.ENUM('restaurant', 'salon', 'turf'),
        allowNull: true,
        defaultValue: 'restaurant'
    },
    role_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    instagram_link: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    bio: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    otp: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    email_verified_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    time_from: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    time_to: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    pricing_range_text: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    menu_card_1: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    menu_card_2: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    menu_card_3: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    menu_card_4: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    menu_card_5: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_image_1: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_image_2: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_image_3: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_image_4: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_image_5: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    password: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    remember_token: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        field: "created_at",
        allowNull: true,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: "updated_at",
        allowNull: true,
    },
    business_mobile: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    is_top: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    address: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    user_image: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    business_image: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    instagram_username: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    wallet: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    user_creatoo_points: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    set_discount: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    set_first_time_discount: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    set_regular_discount: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    min_order: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    set_expiry: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    creatoo_note: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    max_redemption: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    payment_mobile_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    upi_id: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    bank_account_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    ifsc: { type: sequelize_1.DataTypes.STRING, allowNull: true, field: "ifsc" },
    bank_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    branch_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    default_method: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    last_order_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    instagram_fullname: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    following_count: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    follower_count: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    media_count: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    engagement_rate: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
    avg_likes: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
    avg_comments: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
    avg_activity: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
    is_insta_verified: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    verification_note: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    profile_image: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    referrer_code: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    referrer_mobile_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    platform_fee_percent: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    platform_fee_rupees: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    gateway_charges: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    reverse_gateway_charges: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    min_threshold: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
    device_id: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    category_attributes: { type: sequelize_1.DataTypes.JSON, allowNull: true },
}, {
    sequelize: db_1.default,
    tableName: "businesses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
});
exports.default = Business;
