// src/models/Referrer.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Referrer extends Model {
  public id!: number;
  public name!: string;
  public referrer_mobile_number!: string;
  public referrer_code!: string;
  public role_id!: number; // will be 4 for referrers

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Referrer.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    referrer_mobile_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
    },
    referrer_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    role_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 4, // referrer role
    },
    // if your users table has created_at/updated_at columns
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
    tableName: 'users', // IMPORTANT: same table as User
    timestamps: true,
    underscored: true, // if your columns are snake_case
  }
);

export default Referrer;
