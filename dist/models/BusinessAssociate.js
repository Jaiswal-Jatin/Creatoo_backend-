"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const Business_1 = __importDefault(require("./Business"));
class BusinessAssociate extends sequelize_1.Model {
}
BusinessAssociate.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    parent_business_id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
            model: Business_1.default,
            key: 'id'
        }
    },
    associate_business_id: {
        type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
            model: Business_1.default,
            key: 'id'
        }
    },
    created_at: sequelize_1.DataTypes.DATE,
    updated_at: sequelize_1.DataTypes.DATE,
}, {
    tableName: "business_associates",
    sequelize: db_1.default,
    timestamps: true,
    underscored: true,
});
// Define associations
BusinessAssociate.belongsTo(Business_1.default, { foreignKey: 'parent_business_id', as: 'parentBusiness' });
BusinessAssociate.belongsTo(Business_1.default, { foreignKey: 'associate_business_id', as: 'associateBusiness' });
Business_1.default.hasMany(BusinessAssociate, { foreignKey: 'parent_business_id', as: 'associates' });
Business_1.default.hasMany(BusinessAssociate, { foreignKey: 'associate_business_id', as: 'parentAssociations' });
exports.default = BusinessAssociate;
