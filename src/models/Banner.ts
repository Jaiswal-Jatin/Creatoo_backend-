import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

interface BannerAttrs {
  id: number;
  image: string | null;
  link: string | null;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
type BannerCreationAttrs = Optional<BannerAttrs, "id" | "image" | "link" | "is_active">;

export class Banner extends Model<BannerAttrs, BannerCreationAttrs> implements BannerAttrs {
  public id!: number;
  public image!: string | null;
  public link!: string | null;
  public is_active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Banner.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    image: { type: DataTypes.STRING, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "banners", timestamps: true }
);

export default Banner;
