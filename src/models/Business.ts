import {
  Model,
  DataTypes,
  Optional
} from "sequelize";
import sequelize from "../db/sequelize";

interface UserAttributes {
  id: number;
  name: string;

  business_qr_id?: string | null;
  business_name?: string | null;
  business_fullname?: string | null;
  mobile?: string | null;
  email?: string | null;
  business_email?: string | null;
  business_address?: string | null;
  business_area?: string | null;
  business_site_url?: string | null;
  business_designation?: string | null;

  gst_number?: string | null;
  business_type_id?: number | null;
  role_id?: number | null;

  instagram_link?: string | null;
  bio?: string | null;

  // MANY more fields… (include as needed)
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes
  extends Optional<UserAttributes, "id"> {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  public id!: number;
  public name!: string;

  public business_qr_id!: string | null;
  public business_name!: string | null;
  public business_fullname!: string | null;
  public mobile!: string | null;
  public email!: string | null;
  public business_email!: string | null;
  public business_address!: string | null;
  public business_area!: string | null;
  public business_site_url!: string | null;
  public business_designation!: string | null;

  public gst_number!: string | null;
  public business_type_id!: number | null;
  public role_id!: number | null;

  public created_at!: Date;
  public updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    name: { type: DataTypes.STRING, allowNull: false },

    business_name: { type: DataTypes.STRING, allowNull: true },
    business_fullname: { type: DataTypes.STRING, allowNull: true },
    business_email: { type: DataTypes.STRING, allowNull: true },
    business_address: { type: DataTypes.STRING, allowNull: true },
    business_area: { type: DataTypes.STRING, allowNull: true },
    business_site_url: { type: DataTypes.STRING, allowNull: true },
    business_designation: { type: DataTypes.STRING, allowNull: true },

    gst_number: { type: DataTypes.STRING, allowNull: true },

    business_type_id: { type: DataTypes.INTEGER, allowNull: true },
    role_id: { type: DataTypes.INTEGER, allowNull: true },

    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    tableName: "users",
    sequelize,
    timestamps: true,
    underscored: true,
  }
);

export default User;
