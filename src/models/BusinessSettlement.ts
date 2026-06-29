import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

export interface BusinessSettlementAttrs {
  id: number;
  business_id: number;
  type: "bill" | "booking";
  total_amount: number;
  settled_amount: number;
  pending_amount: number;
}

type CreationAttrs = Optional<BusinessSettlementAttrs, "id">;

class BusinessSettlement
  extends Model<BusinessSettlementAttrs, CreationAttrs>
  implements BusinessSettlementAttrs
{
  declare id: number;
  declare business_id: number;
  declare type: "bill" | "booking";
  declare total_amount: number;
  declare settled_amount: number;
  declare pending_amount: number;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

BusinessSettlement.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    business_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM("bill", "booking"), allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    settled_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    pending_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: "business_settlements",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["business_id", "type"] }],
  }
);

export default BusinessSettlement;
