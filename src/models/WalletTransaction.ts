import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

class WalletTransaction extends Model {
  public id!: number;
  public user_id!: number;
  public amount!: number;
  public credit_debit!: string;
  public remark!: string | null;
  public is_withdraw_request!: string | null;
  public via!: string | null;
  public receipt_image!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WalletTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    credit_debit: {
      type: DataTypes.ENUM('credit', 'debit'),
      allowNull: false,
    },
    remark: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_withdraw_request: {
      type: DataTypes.ENUM('0', '1'),
      defaultValue: '0',
    },
    via: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'wallet_transactions',
    underscored: true,
    timestamps: true,
  }
);

// Relation like Laravel: $this->belongsTo(User::class)
WalletTransaction.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

export default WalletTransaction;
