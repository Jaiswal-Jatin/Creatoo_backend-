// src/models/Post.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

export interface PostAttrs {
  id: number;
  user_id: number;
  name: string;
  description: string;
  budget: number;
  duration: number;
  deliverable: string;
  followers_required: number;
  work_mode: number;
  creator_required: number;
  per_creator_amount: number;

  transaction_d?: string | null;
  total_amount: number;
  status: string;
  is_reported?: string | null;
  is_active: number;
  order_id?: string | null;
  counts?: number | null;

  post_status: string;
  payment_status: string;
  payment_status_response?: string | null;
  post_expiry_date?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

// 👇 Export this so PostService can use it
export type Creation = Optional<
  PostAttrs,
  | "id"
  | "transaction_d"
  | "counts"
  | "is_reported"
  | "order_id"
  | "payment_status_response"
  | "post_expiry_date"
  | "status"          // DB default "0"
  | "payment_status"  // DB default "0"
  | "is_active"       // DB default 0
>;

class Post extends Model<PostAttrs, Creation> implements PostAttrs {
  declare id: number;
  declare user_id: number;
  declare name: string;
  declare description: string;
  declare budget: number;
  declare duration: number;
  declare deliverable: string;
  declare followers_required: number;
  declare work_mode: number;
  declare creator_required: number;
  declare per_creator_amount: number;

  declare transaction_d?: string | null;
  declare total_amount: number;
  declare status: string;
  declare is_reported?: string | null;
  declare is_active: number;
  declare order_id?: string | null;
  declare counts?: number | null;

  declare post_status: string;
  declare payment_status: string;
  declare payment_status_response?: string | null;
  declare post_expiry_date?: string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Post.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },

    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
    budget: { type: DataTypes.INTEGER, allowNull: false },
    duration: { type: DataTypes.INTEGER, allowNull: false },
    deliverable: { type: DataTypes.STRING(255), allowNull: false },
    followers_required: { type: DataTypes.INTEGER, allowNull: false },
    work_mode: { type: DataTypes.TINYINT, allowNull: false },
    creator_required: { type: DataTypes.INTEGER, allowNull: false },
    per_creator_amount: { type: DataTypes.INTEGER, allowNull: false },

    transaction_d: { type: DataTypes.STRING(255), allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM("0", "1", "2", "3", "4"),
      allowNull: false,
      defaultValue: "0",
    },
    is_reported: {
      type: DataTypes.ENUM("0", "1", "2"),
      allowNull: true,
      defaultValue: "0",
    },
    is_active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
    },
    order_id: { type: DataTypes.STRING(255), allowNull: true },
    counts: { type: DataTypes.INTEGER, allowNull: true },

    post_status: {
      type: DataTypes.ENUM("0", "1", "2", "3", "4"),
      allowNull: false,
      defaultValue: "0",
    },
    payment_status: {
      type: DataTypes.ENUM("0", "1", "2"),
      allowNull: false,
      defaultValue: "0",
    },
    payment_status_response: { type: DataTypes.STRING(10000), allowNull: true },
    post_expiry_date: { type: DataTypes.STRING(255), allowNull: true },

    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  {
    sequelize,
    tableName: "posts",
    timestamps: true,
    underscored: true,
  }
);

export default Post;
