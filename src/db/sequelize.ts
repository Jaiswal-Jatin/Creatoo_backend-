/**
 * Module: Backend (API Server)
 * File Purpose: Database Configuration using Sequelize ORM.
 * Used By: Backend System
 * API Connected: N/A
 * Database Model: N/A (Initializes connection to MySQL)
 * Critical: Yes
 * Notes: Uses MySQL dialect and underscores for field names.
 */
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
