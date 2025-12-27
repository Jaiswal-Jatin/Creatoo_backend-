// src/models/Version.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

export interface VersionAttributes {
  id: number;
  version: string;   // e.g. "1.0.0"
  message: string;   // e.g. "New update available"
  status: number;    // 1 = active, 0 = inactive
}

export type VersionCreationAttributes = Optional<VersionAttributes, "id">;

class Version
  extends Model<VersionAttributes, VersionCreationAttributes>
  implements VersionAttributes
{
  public id!: number;
  public version!: string;
  public message!: string;
  public status!: number;
}

Version.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // active by default
    },
  },
  {
    sequelize,
    tableName: "versions",
    timestamps: false,
  }
);

export default Version;
