import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

export type SubscriptionStatus =
  | "pending_payment"
  | "active"
  | "queued"
  | "expired"
  | "cancelled";

export type PaymentMethod = "upi" | "card" | "cash" | "paypal";

interface SubscriptionAttrs {
  id: number;
  business_id: number;
  plan_id: number;
  price: number;
  duration: number; // in days (from plan.duration_days)
  status: SubscriptionStatus;
  auto_renew: boolean;
  start_date: Date;
  end_date: Date;
  payment_method: PaymentMethod | null;
  transaction_id: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type SubscriptionCreationAttrs = Optional<
  SubscriptionAttrs,
  | "id"
  | "auto_renew"
  | "payment_method"
  | "transaction_id"
  | "notes"
  | "status"
  | "start_date"
  | "end_date"
>;

export class Subscription
  extends Model<SubscriptionAttrs, SubscriptionCreationAttrs>
  implements SubscriptionAttrs
{
  public id!: number;
  public business_id!: number;
  public plan_id!: number;
  public price!: number;
  public duration!: number;
  public status!: SubscriptionStatus;
  public auto_renew!: boolean;
  public start_date!: Date;
  public end_date!: Date;
  public payment_method!: PaymentMethod | null;
  public transaction_id!: string | null;
  public notes!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subscription.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    plan_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false, // set in service from plan.duration_days
    },
    status: {
      type: DataTypes.ENUM(
        "pending_payment",
        "active",
        "queued",
        "expired",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "pending_payment",
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM("upi", "card", "cash", "paypal"),
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "subscriptions",
    timestamps: true,
  }
);

export default Subscription;
