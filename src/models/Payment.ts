// src/models/Payment.ts
import {
  Model,
  DataTypes,
  Optional
} from "sequelize";
import sequelize from '../db/sequelize';

export interface PaymentAttributes {
  id: number;
  user_id: number;
  post_id?: number | null;
  razorpay_order_id?: string | null;
  status: string;              // e.g. "success", "failed", "pending"
  amount?: number | null;
  response?: object | null;    // store Razorpay JSON response
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    "id" | "post_id" | "razorpay_order_id" | "amount" | "response"
  > {}

class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: number;
  public user_id!: number;
  public post_id!: number | null;
  public razorpay_order_id!: string | null;
  public status!: string;
  public amount!: number | null;
  public response!: object | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
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
    post_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    razorpay_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    response: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "payments",
    modelName: "Payment",
  }
);

export default Payment;
