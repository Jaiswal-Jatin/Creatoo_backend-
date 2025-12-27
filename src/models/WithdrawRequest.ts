import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db/sequelize";
import User from "./User";

export interface WithdrawRequestAttributes {
  id: number;
  creator_id: number;
  amount: number;
  status: number | null;            // 0=pending, 1=completed, 2=rejected
  transaction_id: string | null;

  created_at?: Date;
  updated_at?: Date;
}

// Fields allowed when creating
export type WithdrawRequestCreationAttributes = Optional<
  WithdrawRequestAttributes,
  "id" | "status" | "transaction_id"
>;

class WithdrawRequest
  extends Model<
    WithdrawRequestAttributes,
    WithdrawRequestCreationAttributes
  >
  implements WithdrawRequestAttributes
{
  public id!: number;
  public creator_id!: number;
  public amount!: number;
  public status!: number | null;
  public transaction_id!: string | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WithdrawRequest.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    creator_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        const val = this.getDataValue("amount");
        return val !== null ? Number(val) : null;
      },
    },

    status: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 0, // 0 = pending
    },

    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "withdraw_requests",
    timestamps: true,        // created_at & updated_at
    underscored: true,       // created_at not createdAt
  }
);

// ----------------------------
// RELATIONSHIP
// ----------------------------
WithdrawRequest.belongsTo(User, {
  foreignKey: "creator_id",
  as: "user",
});

export default WithdrawRequest;
