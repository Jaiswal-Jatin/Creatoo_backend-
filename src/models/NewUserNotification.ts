import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

export interface NewUserNotificationAttrs {
  id: number;
  user_id: number;
  order_id: string | null;
  business_id?: number | null;
  notification_subject?: string | null;
  notification_text: string | null;
  is_redeemed: string | number | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export type NewUserNotificationCreationAttrs = Optional<
  NewUserNotificationAttrs,
  "id"
>;

class NewUserNotification
  extends Model<NewUserNotificationAttrs, NewUserNotificationCreationAttrs>
  implements NewUserNotificationAttrs
{
  public id!: number;
  public user_id!: number;
  public order_id!: string | null;
  public business_id!: number | null;
  public notification_subject!: string | null;
  public notification_text!: string | null;
  public is_redeemed!: string | number | null;
  public created_at!: Date | string;
  public updated_at!: Date | string;
}

NewUserNotification.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    order_id: { type: DataTypes.STRING, allowNull: true },
    business_id: { type: DataTypes.INTEGER, allowNull: true },
    notification_subject: { type: DataTypes.STRING, allowNull: true },
    notification_text: { type: DataTypes.TEXT, allowNull: true },
    is_redeemed: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "new_user_notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default NewUserNotification;
