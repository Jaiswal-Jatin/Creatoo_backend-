import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Settlement extends Model {
  public id!: number;
  public business_id!: number;
  public total_amount!: number;
  public transaction_ids!: string;
  public settled_by!: number;
  public transaction_reference!: string | null;
  public notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Settlement.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    transaction_ids: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    settled_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    transaction_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'settlements',
    underscored: true,
    timestamps: true,
  }
);

export default Settlement;
