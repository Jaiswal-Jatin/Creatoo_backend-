import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';

interface BusinessTypeAttrs {
  id: number;
  title: string;
  image: string | null;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type BusinessTypeCreationAttrs = Optional<
  BusinessTypeAttrs,
  'id' | 'image' | 'is_active'
>;

export class BusinessType
  extends Model<BusinessTypeAttrs, BusinessTypeCreationAttrs>
  implements BusinessTypeAttrs
{
  public id!: number;
  public title!: string;
  public image!: string | null;
  public is_active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BusinessType.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    image: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'business_types',
    timestamps: true,
  }
);

export default BusinessType;
