import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

export interface ManualPaymentAttrs {
  id: number;
  user_id: number;
  business_id: number;
  bill_amount: number;
  points_redeemed: number;
  points_value: number;
  final_amount: number;
  discount_percentage: number | null;
  discount_amount: number | null;
  status: "PENDING" | "CONFIRMED" | "SUCCESS" | "FAILED" | "CANCELLED";
  payment_method: string;
  transaction_ref?: string | null;
  upi_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  payment_response?: object | null;
  payment_app?: string | null;
  paid_at: Date | null;
  confirmed_at: Date | null;
  platform_fee: number;
  gst_percent: number;
  gst_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface ManualPaymentCreationAttrs
  extends Optional<ManualPaymentAttrs, "id" | "transaction_ref" | "upi_id" | "razorpay_order_id" | "razorpay_payment_id" | "razorpay_signature" | "payment_response" | "payment_app" | "paid_at" | "confirmed_at" | "created_at" | "updated_at"> {}

class ManualPayment
  extends Model<ManualPaymentAttrs, ManualPaymentCreationAttrs>
  implements ManualPaymentAttrs
{
  declare id: number;
  declare user_id: number;
  declare business_id: number;
  declare bill_amount: number;
  declare points_redeemed: number;
  declare points_value: number;
  declare final_amount: number;
  declare discount_percentage: number | null;
  declare discount_amount: number | null;
  declare status: "PENDING" | "CONFIRMED" | "SUCCESS" | "FAILED" | "CANCELLED";
  declare payment_method: string;
  declare transaction_ref: string | null;
  declare upi_id: string | null;
  declare razorpay_order_id: string | null;
  declare razorpay_payment_id: string | null;
  declare razorpay_signature: string | null;
  declare payment_response: object | null;
  declare payment_app: string | null;
  declare paid_at: Date | null;
  declare confirmed_at: Date | null;
  declare platform_fee: number;
  declare gst_percent: number;
  declare gst_amount: number;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

ManualPayment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    business_id: { type: DataTypes.INTEGER, allowNull: false },
    bill_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    points_redeemed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    points_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    final_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM("PENDING", "CONFIRMED", "SUCCESS", "FAILED", "CANCELLED"),
      defaultValue: "PENDING",
    },
    payment_method: { type: DataTypes.STRING, allowNull: false, defaultValue: "MANUAL" },
    transaction_ref: { type: DataTypes.STRING, allowNull: true },
    upi_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_order_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_signature: { type: DataTypes.STRING, allowNull: true },
    payment_response: { type: DataTypes.JSON, allowNull: true },
    payment_app: { type: DataTypes.STRING, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: true },
    confirmed_at: { type: DataTypes.DATE, allowNull: true },
    platform_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    gst_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    gst_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "manual_payments",
    timestamps: true,
    underscored: true,
  }
);

import User from "./User";
import Business from "./Business";
ManualPayment.belongsTo(User, { foreignKey: "user_id", as: "user" });
ManualPayment.belongsTo(Business, { foreignKey: "business_id", as: "business" });

export default ManualPayment;
