/**
 * Module: Backend (API Server)
 * File Purpose: User Model definition. Handles both standard Users and Business Admin Users.
 * Used By: All Roles (Admin, Business Admin, User)
 * API Connected: /api/users, /api/business, /api/admin
 * Database Model: users table
 * Critical: Yes
 * Notes: Centralized user model with support for business details, Instagram metrics, and wallet/points system.
 */
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

export interface UserAttrs {
  id: number;
  name: string | null;
  business_qr_id: string | null;
  business_name: string | null;
  business_fullname: string | null;
  mobile: string | null;
  email: string | null;
  business_email: string | null;
  business_address: string | null;
  business_area: string | null;
  business_site_url: string | null;
  business_designation: string | null;
  gst_number: string | null;
  business_type_id: number | null;
  role_id: number | null;
  instagram_link: string | null;
  bio: string | null;
  otp: string | null;
  is_active: boolean;
  email_verified_at: Date | null;

  // business description
  time_from: string | null;
  time_to: string | null;
  pricing_range_text: string | null;

  // menu cards
  menu_card_1: string | null;
  menu_card_2: string | null;
  menu_card_3: string | null;
  menu_card_4: string | null;
  menu_card_5: string | null;

  // business images
  business_image_1: string | null;
  business_image_2: string | null;
  business_image_3: string | null;
  business_image_4: string | null;
  business_image_5: string | null;

  password: string | null;
  remember_token: string | null;

  // mapped to created_at / updated_at in DB
  createdAt: Date | null;
  updatedAt: Date | null;

  business_mobile: string | null;
  is_top: boolean;
  address: string | null;
  user_image: string | null;
  business_image: string | null;
  instagram_username: string | null;
  wallet: number | null;
  user_creatoo_points: number | null;

  // discount fields
  set_discount: number | null;
  set_first_time_discount: number | null;
  set_regular_discount: number | null;
  min_order: number | null;
  set_expiry: number | null;
  creatoo_note: string | null;
  max_redemption: number | null;

  // payout / bank details
  payment_mobile_number: string | null;
  upi_id: string | null;
  bank_account_number: string | null;
  ifsc: string | null;
  bank_name: string | null;
  branch_name: string | null;
  default_method: string | null;
  last_order_id: number | null;

  // Instagram metrics
  instagram_fullname: string | null;
  following_count: number | null;
  follower_count: number | null;
  media_count: number | null;
  engagement_rate: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  avg_activity: number | null;

  is_insta_verified: number | null;
  verification_note: string | null;
  profile_image: string | null;

  // referral / platform config
  referrer_code: string | null;
  referrer_mobile_number: string | null;
  platform_fee_percent: number | null;
  platform_fee_rupees: number | null;
  gateway_charges: number | null;
  reverse_gateway_charges: number | null;
  min_threshold: number | null;
  device_id: string | null;
}

export type UserCreationAttrs = Optional<UserAttrs, "id">;

/**
 * Class: User
 * Role: Shared
 * Description: Sequelize Model for the 'users' table.
 */
export class User
  extends Model<UserAttrs, UserCreationAttrs>
  implements UserAttrs
{
  public id!: number;
  public name!: string | null;
  public business_qr_id!: string | null;
  public business_name!: string | null;
  public business_fullname!: string | null;
  public mobile!: string | null;
  public email!: string | null;
  public business_email!: string | null;
  public business_address!: string | null;
  public business_area!: string | null;
  public business_site_url!: string | null;
  public business_designation!: string | null;
  public gst_number!: string | null;
  public business_type_id!: number | null;
  public role_id!: number | null;
  public instagram_link!: string | null;
  public bio!: string | null;
  public otp!: string | null;
  public is_active!: boolean;
  public email_verified_at!: Date | null;

  public time_from!: string | null;
  public time_to!: string | null;
  public pricing_range_text!: string | null;

  public menu_card_1!: string | null;
  public menu_card_2!: string | null;
  public menu_card_3!: string | null;
  public menu_card_4!: string | null;
  public menu_card_5!: string | null;

  public business_image_1!: string | null;
  public business_image_2!: string | null;
  public business_image_3!: string | null;
  public business_image_4!: string | null;
  public business_image_5!: string | null;

  public password!: string | null;
  public remember_token!: string | null;

  public createdAt!: Date | null;
  public updatedAt!: Date | null;

  public business_mobile!: string | null;
  public is_top!: boolean;
  public address!: string | null;
  public user_image!: string | null;
  public business_image!: string | null;
  public instagram_username!: string | null;
  public wallet!: number | null;
  public user_creatoo_points!: number | null;

  public set_discount!: number | null;
  public set_first_time_discount!: number | null;
  public set_regular_discount!: number | null;
  public min_order!: number | null;
  public set_expiry!: number | null;
  public creatoo_note!: string | null;
  public max_redemption!: number | null;

  public payment_mobile_number!: string | null;
  public upi_id!: string | null;
  public bank_account_number!: string | null;
  public ifsc!: string | null;
  public bank_name!: string | null;
  public branch_name!: string | null;
  public default_method!: string | null;
  public last_order_id!: number | null;

  public instagram_fullname!: string | null;
  public following_count!: number | null;
  public follower_count!: number | null;
  public media_count!: number | null;
  public engagement_rate!: number | null;
  public avg_likes!: number | null;
  public avg_comments!: number | null;
  public avg_activity!: number | null;

  public is_insta_verified!: number | null;
  public verification_note!: string | null;
  public profile_image!: string | null;

  public referrer_code!: string | null;
  public referrer_mobile_number!: string | null;
  public platform_fee_percent!: number | null;
  public platform_fee_rupees!: number | null;
  public gateway_charges!: number | null;
  public reverse_gateway_charges!: number | null;
  public min_threshold!: number | null;
  public device_id!: string | null;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: true },
    business_qr_id: { type: DataTypes.STRING, allowNull: true },
    business_name: { type: DataTypes.STRING, allowNull: true },
    business_fullname: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    business_email: { type: DataTypes.STRING, allowNull: true },
    business_address: { type: DataTypes.STRING, allowNull: true },
    business_area: { type: DataTypes.STRING, allowNull: true },
    business_site_url: { type: DataTypes.STRING, allowNull: true },
    business_designation: { type: DataTypes.STRING, allowNull: true },
    gst_number: { type: DataTypes.STRING, allowNull: true },
    business_type_id: { type: DataTypes.INTEGER, allowNull: true },
    role_id: { type: DataTypes.INTEGER, allowNull: true },
    instagram_link: { type: DataTypes.STRING, allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    otp: { type: DataTypes.STRING, allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    email_verified_at: { type: DataTypes.DATE, allowNull: true },

    time_from: { type: DataTypes.STRING, allowNull: true },
    time_to: { type: DataTypes.STRING, allowNull: true },
    pricing_range_text: { type: DataTypes.STRING, allowNull: true },

    menu_card_1: { type: DataTypes.STRING, allowNull: true },
    menu_card_2: { type: DataTypes.STRING, allowNull: true },
    menu_card_3: { type: DataTypes.STRING, allowNull: true },
    menu_card_4: { type: DataTypes.STRING, allowNull: true },
    menu_card_5: { type: DataTypes.STRING, allowNull: true },

    business_image_1: { type: DataTypes.STRING, allowNull: true },
    business_image_2: { type: DataTypes.STRING, allowNull: true },
    business_image_3: { type: DataTypes.STRING, allowNull: true },
    business_image_4: { type: DataTypes.STRING, allowNull: true },
    business_image_5: { type: DataTypes.STRING, allowNull: true },

    password: { type: DataTypes.STRING, allowNull: true },
    remember_token: { type: DataTypes.STRING, allowNull: true },

    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
      allowNull: true,
    },

    business_mobile: { type: DataTypes.STRING, allowNull: true },
    is_top: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    address: { type: DataTypes.STRING, allowNull: true },
    user_image: { type: DataTypes.STRING, allowNull: true },
    business_image: { type: DataTypes.STRING, allowNull: true },
    instagram_username: { type: DataTypes.STRING, allowNull: true },
    wallet: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    user_creatoo_points: { type: DataTypes.INTEGER, allowNull: true },

    set_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    set_first_time_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    set_regular_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    min_order: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    set_expiry: { type: DataTypes.INTEGER, allowNull: true },
    creatoo_note: { type: DataTypes.TEXT, allowNull: true },
    max_redemption: { type: DataTypes.INTEGER, allowNull: true },

    payment_mobile_number: { type: DataTypes.STRING, allowNull: true },
    upi_id: { type: DataTypes.STRING, allowNull: true },
    bank_account_number: { type: DataTypes.STRING, allowNull: true },
    ifsc: { type: DataTypes.STRING, allowNull: true, field: "ifsc" },

    bank_name: { type: DataTypes.STRING, allowNull: true },
    branch_name: { type: DataTypes.STRING, allowNull: true },
    default_method: { type: DataTypes.STRING, allowNull: true },
    last_order_id: { type: DataTypes.INTEGER, allowNull: true },

    instagram_fullname: { type: DataTypes.STRING, allowNull: true },
    following_count: { type: DataTypes.INTEGER, allowNull: true },
    follower_count: { type: DataTypes.INTEGER, allowNull: true },
    media_count: { type: DataTypes.INTEGER, allowNull: true },
    engagement_rate: { type: DataTypes.FLOAT, allowNull: true },
    avg_likes: { type: DataTypes.FLOAT, allowNull: true },
    avg_comments: { type: DataTypes.FLOAT, allowNull: true },
    avg_activity: { type: DataTypes.FLOAT, allowNull: true },

    is_insta_verified: { type: DataTypes.INTEGER, allowNull: true },
    verification_note: { type: DataTypes.TEXT, allowNull: true },
    profile_image: { type: DataTypes.STRING, allowNull: true },

    referrer_code: { type: DataTypes.STRING, allowNull: true },
    referrer_mobile_number: { type: DataTypes.STRING, allowNull: true },
    platform_fee_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    platform_fee_rupees: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    gateway_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    reverse_gateway_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    min_threshold: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    device_id: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default User;
