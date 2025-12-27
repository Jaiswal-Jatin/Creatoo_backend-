// src/models/UserNotification.ts
import {
  Model,
  DataTypes,
  Optional
} from "sequelize";
import sequelize from '../db/sequelize';

export interface UserNotificationAttributes {
  id: number;
  user_id: number;
  title: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserNotificationCreationAttributes
  extends Optional<UserNotificationAttributes, "id" | "createdAt" | "updatedAt"> {}

class UserNotification
  extends Model<UserNotificationAttributes, UserNotificationCreationAttributes>
  implements UserNotificationAttributes
{
  public id!: number;
  public user_id!: number;
  public title!: string;
  public description!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserNotification.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "user_notifications",
    modelName: "UserNotification",
  }
);

export default UserNotification;
