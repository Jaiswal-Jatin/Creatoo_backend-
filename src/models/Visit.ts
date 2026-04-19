// src/models/Visit.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

export type VisitTier = "new" | "core" | "elite" | "premium";

export interface VisitAttributes {
  id: number;
  user_id: number | null;     // owner of the card (from cards.user_id)
  card_number: number;
  business_id: number;        // logged-in business (from token)
  tier: VisitTier;
  time: Date;
}

export type VisitCreationAttributes = Optional<
  VisitAttributes,
  "id" | "user_id" | "tier" | "time"
>;

class Visit
  extends Model<VisitAttributes, VisitCreationAttributes>
  implements VisitAttributes
{
  public id!: number;
  public user_id!: number | null;
  public card_number!: number;
  public business_id!: number;
  public tier!: VisitTier;
  public time!: Date;
}

Visit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    card_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tier: {
      type: DataTypes.ENUM("new", "core", "elite", "premium"),
      allowNull: false,
      defaultValue: "new",
    },
    time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "visits",
    timestamps: false,
  }
);

export default Visit;
