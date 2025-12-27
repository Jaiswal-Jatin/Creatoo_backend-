import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

export interface ReviewAttrs {
  id: number;
  user_id: number;
  business_id: number;
  experience: number;
  expectation: number;
  recommend: number;
  fair_money: number;
  interaction: number;
  review_text: string | null;
  order_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export type ReviewCreationAttrs = Optional<ReviewAttrs, "id">;

class Review
  extends Model<ReviewAttrs, ReviewCreationAttrs>
  implements ReviewAttrs
{
  public id!: number;
  public user_id!: number;
  public business_id!: number;
  public experience!: number;
  public expectation!: number;
  public recommend!: number;
  public fair_money!: number;
  public interaction!: number;
  public review_text!: string | null;
  public order_id!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Review.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    business_id: { type: DataTypes.INTEGER, allowNull: false },
    experience: { type: DataTypes.INTEGER, allowNull: false },
    expectation: { type: DataTypes.INTEGER, allowNull: false },
    recommend: { type: DataTypes.INTEGER, allowNull: false },
    fair_money: { type: DataTypes.INTEGER, allowNull: false },
    interaction: { type: DataTypes.INTEGER, allowNull: false },
    review_text: { type: DataTypes.TEXT, allowNull: true },
    order_id: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "reviews",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Review;
