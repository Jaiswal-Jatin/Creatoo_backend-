import { DataTypes, Model } from "sequelize";
import sequelize from "../db/sequelize";
import Post from "./Post";
import User from "./User";

class PostReport extends Model {
  public id!: number;
  public post_id!: number;
  public user_id!: number;
  public description!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PostReport.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: "post_reports",
    timestamps: true,
    underscored: true,
  }
);

// relations
PostReport.belongsTo(Post, {
  foreignKey: "post_id",
  as: "post",
});

PostReport.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

export default PostReport;
