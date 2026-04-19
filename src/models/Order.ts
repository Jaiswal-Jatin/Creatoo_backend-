import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import User from "./User"; // users table

// --------------------
// Types
// --------------------
interface OrderAttributes {
  id: number;
  user_id: number;
  referrer_id: number | null;
  business_id: number;

  order_id: string;
  original_bill_amount: number | null;
  discounted_bill: number | null;
  discount_percentage: number | null;
  loyalty_points_used_discount_amount: number | null;
  platform_fee: number | null;
  gateway_charges: number | null;
  reverse_gateway_charges: number | null;
  settlement_amount: number | null;
  final_bill_amount: number | null;
  loyalty_points_earned: number | null;
  transaction_response: string | null;
  expiry_date: Date | null;
  review_status: string | null;
  status: string | null;

  created_at?: Date;
  updated_at?: Date;
}

type OrderCreation = Optional<OrderAttributes, "id">;

// --------------------
// Model
// --------------------
class Order extends Model<OrderAttributes, OrderCreation> implements OrderAttributes {
  public id!: number;
  public user_id!: number;
  public referrer_id!: number | null;
  public business_id!: number;

  public order_id!: string;
  public original_bill_amount!: number | null;
  public discounted_bill!: number | null;
  public discount_percentage!: number | null;
  public loyalty_points_used_discount_amount!: number | null;
  public platform_fee!: number | null;
  public gateway_charges!: number | null;
  public reverse_gateway_charges!: number | null;
  public settlement_amount!: number | null;
  public final_bill_amount!: number | null;
  public loyalty_points_earned!: number | null;
  public transaction_response!: string | null;
  public expiry_date!: Date | null;
  public review_status!: string | null;
  public status!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

// --------------------
// Init
// --------------------
Order.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    referrer_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    business_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    order_id: { type: DataTypes.STRING, allowNull: false },

    original_bill_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    discounted_bill: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    discount_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    loyalty_points_used_discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    platform_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    gateway_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    reverse_gateway_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    settlement_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    final_bill_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    loyalty_points_earned: { type: DataTypes.INTEGER, allowNull: true },
    transaction_response: { type: DataTypes.TEXT, allowNull: true },
    expiry_date: { type: DataTypes.DATE, allowNull: true },
    review_status: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: true },

    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "orders",
    timestamps: true,
    underscored: true,
  }
);

// ----------------------------
// 🔗 Relations (Correct)
// ----------------------------

// Customer (creator)
Order.belongsTo(User, {
  foreignKey: "user_id",
  as: "creator",
});

// Referrer
Order.belongsTo(User, {
  foreignKey: "referrer_id",
  as: "referrer",
});

// Business
Order.belongsTo(User, {
  foreignKey: "business_id",
  as: "business",
});

export default Order;
