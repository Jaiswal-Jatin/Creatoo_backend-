// src/models/TemporaryOrder.ts
import {
  Model,
  DataTypes,
  Optional
} from "sequelize";
import sequelize from "../db/sequelize";

export interface TemporaryOrderAttributes {
  id: number;
  user_id: number;
  business_id: number;
  order_id: string;
  bill_amount?: number | null;
  original_bill_amount?: number | null;
  discounted_bill?: number | null;
  reverse_gateway_charges?: number | null;
  loyalty_points_used_discount_amount?: number | null;
  platform_fee?: number | null;
  settlement_amount?: number | null;
  gateway_charges?: number | null;
  discount_percentage?: number | null;
  gst_on_gateway_charges?: number | null;
  final_bill_amount?: number | null;
  loyalty_points_will_earn?: number | null;
  expiry_date?: Date | null;
  referrer_id?: number | null;
  review_status?: string | null;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface TemporaryOrderCreationAttributes
  extends Optional<
    TemporaryOrderAttributes,
    | "id"
    | "bill_amount"
    | "original_bill_amount"
    | "discounted_bill"
    | "reverse_gateway_charges"
    | "loyalty_points_used_discount_amount"
    | "platform_fee"
    | "settlement_amount"
    | "gateway_charges"
    | "discount_percentage"
    | "gst_on_gateway_charges"
    | "final_bill_amount"
    | "loyalty_points_will_earn"
    | "expiry_date"
    | "referrer_id"
    | "review_status"
    | "created_at"
    | "updated_at"
  > {}

class TemporaryOrder
  extends Model<TemporaryOrderAttributes, TemporaryOrderCreationAttributes>
  implements TemporaryOrderAttributes
{
  public id!: number;
  public user_id!: number;
  public business_id!: number;
  public order_id!: string;

  public bill_amount!: number | null;
  public original_bill_amount!: number | null;
  public discounted_bill!: number | null;
  public reverse_gateway_charges!: number | null;
  public loyalty_points_used_discount_amount!: number | null;
  public platform_fee!: number | null;
  public settlement_amount!: number | null;
  public gateway_charges!: number | null;
  public discount_percentage!: number | null;
  public gst_on_gateway_charges!: number | null;
  public final_bill_amount!: number | null;
  public loyalty_points_will_earn!: number | null;
  public expiry_date!: Date | null;
  public referrer_id!: number | null;
  public review_status!: string | null;
  public status!: string;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TemporaryOrder.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    order_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    bill_amount: DataTypes.DECIMAL(10, 2),
    original_bill_amount: DataTypes.DECIMAL(10, 2),
    discounted_bill: DataTypes.DECIMAL(10, 2),
    reverse_gateway_charges: DataTypes.DECIMAL(10, 2),
    loyalty_points_used_discount_amount: DataTypes.DECIMAL(10, 2),
    platform_fee: DataTypes.DECIMAL(10, 2),
    settlement_amount: DataTypes.DECIMAL(10, 2),
    gateway_charges: DataTypes.DECIMAL(10, 2),
    discount_percentage: DataTypes.DECIMAL(10, 2),
    gst_on_gateway_charges: DataTypes.DECIMAL(10, 2),
    final_bill_amount: DataTypes.DECIMAL(10, 2),
    loyalty_points_will_earn: DataTypes.INTEGER,
    expiry_date: DataTypes.DATE,
    referrer_id: DataTypes.INTEGER,
    review_status: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Pending",
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "temporary_orders",
    modelName: "TemporaryOrder",
    timestamps: false,            // if you use created_at/updated_at manually
    underscored: true,           // because DB uses created_at, not createdAt
  }
);

export default TemporaryOrder;
