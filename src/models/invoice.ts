import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

interface InvoiceAttrs {
  id: number;
  business_id: number;
  subscription_id: number;
  amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  razorpay_order_id: string | null;   // 👈 IMPORTANT
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type InvoiceCreationAttrs = Optional<
  InvoiceAttrs,
  "id" | "payment_method" | "transaction_id" | "razorpay_order_id" | "status"
>;

export class Invoice
  extends Model<InvoiceAttrs, InvoiceCreationAttrs>
  implements InvoiceAttrs
{
  public id!: number;
  public business_id!: number;
  public subscription_id!: number;
  public amount!: number;
  public payment_method!: string | null;
  public transaction_id!: string | null;
  public razorpay_order_id!: string | null;  // 👈 IMPORTANT
  public status!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Invoice.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    subscription_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razorpay_order_id: {                // 👈 MATCH DATABASE
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",          // 👈 correct default
    },
  },
  {
    sequelize,
    tableName: "invoices",
    timestamps: true,
  }
);

export default Invoice;
