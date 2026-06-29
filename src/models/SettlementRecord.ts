import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

export interface SettlementRecordAttrs {
  id: number;
  business_id: number;
  type: "bill" | "booking" | "combined";
  amount: number;
  bill_amount: number;
  booking_amount: number;
  remaining_after: number;
  notes: string | null;
  settled_by: number;
}

type CreationAttrs = Optional<SettlementRecordAttrs, "id" | "notes">;

class SettlementRecord
  extends Model<SettlementRecordAttrs, CreationAttrs>
  implements SettlementRecordAttrs
{
  declare id: number;
  declare business_id: number;
  declare type: "bill" | "booking" | "combined";
  declare amount: number;
  declare bill_amount: number;
  declare booking_amount: number;
  declare remaining_after: number;
  declare notes: string | null;
  declare settled_by: number;
  declare readonly created_at: Date;
}

SettlementRecord.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    business_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM("bill", "booking", "combined"), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    bill_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    booking_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    remaining_after: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    notes: { type: DataTypes.STRING, allowNull: true },
    settled_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    sequelize,
    tableName: "settlement_records",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default SettlementRecord;
