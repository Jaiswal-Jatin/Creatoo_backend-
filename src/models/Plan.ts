import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface PlanAttrs {
  id: number;
  name: string;
  description: string | null;
  price: number;          // price for the plan
  duration_days: number;  // required now (no default)
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type PlanCreationAttrs = Optional<
  PlanAttrs,
  "id" | "description" | "is_active"
>; // duration_days is REQUIRED now

export class Plan
  extends Model<PlanAttrs, PlanCreationAttrs>
  implements PlanAttrs
{
  public id!: number;
  public name!: string;
  public description!: string | null;
  public price!: number;
  public duration_days!: number;
  public is_active!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Plan.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    duration_days: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,   // no default, must be provided
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "plans",
    timestamps: true,
  }
);

export default Plan;
