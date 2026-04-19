// src/models/CreatooRequest.ts
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import User from "./User";

class CreatooRequest extends Model {
  public id!: number;
  public creator_id!: number;
  public business_id!: number;
  public image!: string | null;
  public status!: number; // 0=pending,1=approved,2=rejected,3=redeemed
  public points_received!: number | null;
  public active_points!: number | null;
  public bill_amount!: number | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CreatooRequest.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    creator_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    points_received: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    active_points: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    bill_amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "creatoo_requests",
    timestamps: true,
    underscored: true,
  }
);

// relations like in Laravel: creator() and business()
CreatooRequest.belongsTo(User, {
  foreignKey: "creator_id",
  as: "creator",
});

CreatooRequest.belongsTo(User, {
  foreignKey: "business_id",
  as: "business",
});

export default CreatooRequest;
