import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface ExclusiveOfferAttrs {
  id: number;
  business_id: number;
  premium: string[] | null;
  elite: string[] | null;
  core: string[] | null;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type ExclusiveOfferCreationAttrs = Optional<
  ExclusiveOfferAttrs,
  "id" | "premium" | "elite" | "core" | "is_active"
>;

export class ExclusiveOffer
  extends Model<ExclusiveOfferAttrs, ExclusiveOfferCreationAttrs>
  implements ExclusiveOfferAttrs
{
  public id!: number;
  public business_id!: number;
  public premium!: string[] | null;
  public elite!: string[] | null;
  public core!: string[] | null;
  public is_active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const jsonGetter = (field: string) => {
  return function (this: any): string[] {
    const raw = this.getDataValue(field) as string | null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw ? [raw] : [];
    }
  };
};

const jsonSetter = (field: string) => {
  return function (this: any, value: string[] | null) {
    if (!value || !value.length) {
      this.setDataValue(field, null);
    } else {
      this.setDataValue(field, JSON.stringify(value));
    }
  };
};

ExclusiveOffer.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    business_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
    },
    premium: {
      type: DataTypes.TEXT,
      allowNull: true,
      get: jsonGetter("premium"),
      set: jsonSetter("premium"),
    },
    elite: {
      type: DataTypes.TEXT,
      allowNull: true,
      get: jsonGetter("elite"),
      set: jsonSetter("elite"),
    },
    core: {
      type: DataTypes.TEXT,
      allowNull: true,
      get: jsonGetter("core"),
      set: jsonSetter("core"),
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "exclusive_offers",
    timestamps: true,
  }
);

export default ExclusiveOffer;
