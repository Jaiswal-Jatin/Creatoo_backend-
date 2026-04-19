// src/models/CreatorPointsTransaction.ts
import {
  DataTypes,
  Model,
  Optional,
} from "sequelize";
import sequelize from "../config/db";

export interface CreatorPointsTransactionAttrs {
  id: number;
  user_id: number;
  business_id: number | null;
  order_id: string | null;
  points: number; // <-- DB column `points`
  expiry_date: Date | null;
  credit_debit_remaining_status: string | null;
  business_name: string | null;
  total_bill: number | null;
  settlement_amount: number | null;
  discount_percentage: number | null;
  final_bill: number | null;
  receipt_name: string | null;
  remaining_points: number; // <-- DB column `remaining_points`
  reverse_gateway_charges: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type CreationAttrs = Optional<
  CreatorPointsTransactionAttrs,
  | "id"
  | "business_id"
  | "order_id"
  | "expiry_date"
  | "credit_debit_remaining_status"
  | "business_name"
  | "total_bill"
  | "settlement_amount"
  | "discount_percentage"
  | "final_bill"
  | "receipt_name"
  | "reverse_gateway_charges"
  | "createdAt"
  | "updatedAt"
>;

class CreatorPointsTransaction
  extends Model<CreatorPointsTransactionAttrs, CreationAttrs>
  implements CreatorPointsTransactionAttrs
{
  declare id: number;
  declare user_id: number;
  declare business_id: number | null;
  declare order_id: string | null;
  declare points: number;
  declare expiry_date: Date | null;
  declare credit_debit_remaining_status: string | null;
  declare business_name: string | null;
  declare total_bill: number | null;
  declare settlement_amount: number | null;
  declare discount_percentage: number | null;
  declare final_bill: number | null;
  declare receipt_name: string | null;
  declare remaining_points: number;
  declare reverse_gateway_charges: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CreatorPointsTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    order_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    points: {
      // ⬅️ matches DB column `points`
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    credit_debit_remaining_status: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    business_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    total_bill: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    settlement_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    final_bill: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    receipt_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    remaining_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reverse_gateway_charges: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "creator_points_transactions",
    timestamps: true,
    underscored: true, // uses created_at / updated_at
  }
);

export default CreatorPointsTransaction;
