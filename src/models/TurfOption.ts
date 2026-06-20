import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class TurfOption extends Model {
  public id!: number;
  public type!: 'court_size' | 'ground_type' | 'sport' | 'amenity';
  public value!: string;
  public sort_order!: number;
}

TurfOption.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('court_size', 'ground_type', 'sport', 'amenity'),
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'turf_options',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default TurfOption;
