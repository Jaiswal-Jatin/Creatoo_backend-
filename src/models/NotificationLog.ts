import { DataTypes, Model } from "sequelize";
import sequelize from "../db/sequelize";

class NotificationLog extends Model {
  public id!: number;
  public user_id!: number;
  public title!: string;
  public message!: string;
  public token!: string | null;
  public type!: string | null;
  public status!: "SENT" | "FAILED";
  public error!: string | null;
  public created_at!: Date | string;
  public updated_at!: Date | string;
}

NotificationLog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("SENT", "FAILED"),
      defaultValue: "SENT",
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "notification_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default NotificationLog;
