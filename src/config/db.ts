import { Sequelize } from 'sequelize';
import env from './env';

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  dialect: 'mysql',
  logging: false,
  timezone: '+05:30',
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
    timezone: '+05:30'
  },
  define: { underscored: true, timestamps: true }
});

export default sequelize;
