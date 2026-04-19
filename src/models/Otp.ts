import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';

export interface OtpAttrs {
  id: number;
  mobile?: string | null;
  business_mobile?: string | null;
  otp: string;                 // <= plain OTP column
  created_at?: Date;
  updated_at?: Date;
}

type OtpCreation = Optional<OtpAttrs, 'id'>;

class Otp extends Model<OtpAttrs, OtpCreation> implements OtpAttrs {
  public id!: number;
  public mobile!: string | null;
  public business_mobile!: string | null;
  public otp!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Otp.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    mobile: { type: DataTypes.STRING(15), allowNull: true },
    business_mobile: { type: DataTypes.STRING(15), allowNull: true },
    otp: { type: DataTypes.STRING(10), allowNull: false },  // <= plain OTP
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'otps', modelName: 'Otp', underscored: true, timestamps: true }
);

export default Otp;
