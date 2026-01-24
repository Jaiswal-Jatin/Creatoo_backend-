// src/models/PostInterest.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";
import User from "./User";
import Post from "./Post";

interface PostInterestAttributes {
  id: number;
  post_id: number;
  creator_id: number;
  is_cart: number | null;
  is_shortlist: number | null;
  is_payment_done: number | null;
  created_at?: Date;
  updated_at?: Date;
}

type PostInterestCreation = Optional<PostInterestAttributes, "id" | "is_cart" | "is_shortlist" | "is_payment_done">;

class PostInterest
  extends Model<PostInterestAttributes, PostInterestCreation>
  implements PostInterestAttributes
{
  public id!: number;
  public post_id!: number;
  public creator_id!: number;
  public is_cart!: number | null;
  public is_shortlist!: number | null;
  public is_payment_done!: number | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PostInterest.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    creator_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    is_cart: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,
    },
    is_shortlist: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,
    },
    is_payment_done: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: "post_interests",
    timestamps: true,
    underscored: true,
  }
);

// NOTE: Association removed - live database has no primary key on posts.id
// PostInterest.belongsTo(User, { foreignKey: "creator_id", as: "creator" });
// PostInterest.belongsTo(Post, { foreignKey: "post_id", as: "post" });

export default PostInterest;
