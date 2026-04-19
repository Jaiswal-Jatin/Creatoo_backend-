import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class PromotionalNotification extends Model {
  public id!: number;
  public subject!: string;
  public promotional_notification_text!: string;
  public type!: number; // 1 = normal, 2 = dynamic, 3 = festival, 4 = custom

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PromotionalNotification.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    promotional_notification_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
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
    tableName: 'promotional_notifications',
    timestamps: true,
    underscored: true,
  }
);

export default PromotionalNotification;
