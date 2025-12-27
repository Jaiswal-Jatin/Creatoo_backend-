import { Sequelize } from 'sequelize';
import env from '../config/env';

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  define: { underscored: true, freezeTableName: false },
});

export default sequelize;
