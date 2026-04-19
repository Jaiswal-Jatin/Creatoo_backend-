import {
  Model,
  DataTypes,
  Optional
} from "sequelize";
import sequelize from "../config/db";
import User from "./User";

interface BusinessAssociateAttributes {
  id: number;
  parent_business_id: number;
  associate_business_id: number;
  created_at?: Date;
  updated_at?: Date;
}

interface BusinessAssociateCreationAttributes
  extends Optional<BusinessAssociateAttributes, "id"> {}

class BusinessAssociate
  extends Model<BusinessAssociateAttributes, BusinessAssociateCreationAttributes>
  implements BusinessAssociateAttributes {
  public id!: number;
  public parent_business_id!: number;
  public associate_business_id!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

BusinessAssociate.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    parent_business_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    associate_business_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    tableName: "business_associates",
    sequelize,
    timestamps: true,
    underscored: true,
  }
);

// Define associations
BusinessAssociate.belongsTo(User, { foreignKey: 'parent_business_id', as: 'parentBusiness' });
BusinessAssociate.belongsTo(User, { foreignKey: 'associate_business_id', as: 'associateBusiness' });
User.hasMany(BusinessAssociate, { foreignKey: 'parent_business_id', as: 'associates' });
User.hasMany(BusinessAssociate, { foreignKey: 'associate_business_id', as: 'parentAssociations' });

export default BusinessAssociate;
