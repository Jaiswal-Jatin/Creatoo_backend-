// src/models/Card.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";

export interface CardAttributes {
  id: number;
  number: number;
  status: number;          // 0 = not activated, 1 = activated
  user_id: number | null;  // user who owns the card
  name: string | null;     // name given when activating
  business_id: number;     // required field
  created_at: Date;        // <-- NEW FIELD
}

export type CardCreationAttributes = Optional<
  CardAttributes,
  "id" | "status" | "user_id" | "name" | "created_at"
>;

class Card
  extends Model<CardAttributes, CardCreationAttributes>
  implements CardAttributes {
  public id!: number;
  public number!: number;
  public status!: number;
  public user_id!: number | null;
  public name!: string | null;
  public business_id!: number;
  public created_at!: Date;    // <-- ADD THIS
}

Card.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ✅ ADD THIS FIELD
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "cards",
    timestamps: false, // keeping it disabled
  }
);

export default Card;
