import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Setting extends Model {
  public id!: number;
  public cgst_percent!: number;
  public sgst_percent!: number;
  public igst_percent!: number;
  public platform_fee_percent!: number;
  public gateway_charges!: number;
  public reverse_gateway_charges!: number;
  public creatoo_points!: number;
  public advance_platform_fee!: number;
  public advance_platform_fee_active!: boolean;
  public advance_gst_percent!: number;
  public advance_gst_active!: boolean;
  public signup_bonus_points!: number;
  public manual_platform_fee!: number;
  public manual_platform_fee_active!: boolean;
  public manual_gst_percent!: number;
  public manual_gst_active!: boolean;
}

Setting.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    cgst_percent: DataTypes.FLOAT,
    sgst_percent: DataTypes.FLOAT,
    igst_percent: DataTypes.FLOAT,
    platform_fee_percent: DataTypes.FLOAT,
    gateway_charges: DataTypes.FLOAT,
    reverse_gateway_charges: DataTypes.FLOAT,
    creatoo_points: DataTypes.FLOAT,
    advance_platform_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    advance_platform_fee_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    advance_gst_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    advance_gst_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    signup_bonus_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
    },
    manual_platform_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    manual_platform_fee_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    manual_gst_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    manual_gst_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'settings',
  }
);

export default Setting;
