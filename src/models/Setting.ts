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
  },
  {
    sequelize,
    tableName: 'settings',
  }
);

export default Setting;
