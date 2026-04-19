/**
 * Module: Backend (API Server)
 * File Purpose: Admin Service for direct database interactions with 'admins' table.
 * Used By: AdminController, adminOnly Middleware
 * API Connected: N/A
 * Database Model: admins table (Raw SQL)
 * Critical: Yes
 * Notes: Uses raw SQL queries instead of Sequelize models for Admin management.
 */
import sequelize from '../db/sequelize';
import { QueryTypes } from 'sequelize';

export interface Admin {
  id: number;
  name: string;
  email: string;
  password: string; // hashed
  created_at?: Date;
  updated_at?: Date;
}

export default class AdminService {
  /**
   * Function: findByEmail()
   * Description: Finds an admin by their email address.
   * Params: email (string)
   * Returns: Admin object or null
   */
  async findByEmail(email: string): Promise<Admin | null> {
    const rows = (await sequelize.query(
      'SELECT * FROM admins WHERE email = ? LIMIT 1',
      {
        type: QueryTypes.SELECT,
        replacements: [email],
      }
    )) as Admin[];

    return rows[0] || null;
  }

  /**
   * Function: findById()
   * Description: Finds an admin by their numeric ID.
   * Params: id (number)
   * Returns: Admin object or null
   */
  async findById(id: number): Promise<Admin | null> {
    const rows = (await sequelize.query(
      'SELECT * FROM admins WHERE id = ? LIMIT 1',
      {
        type: QueryTypes.SELECT,
        replacements: [id],
      }
    )) as Admin[];

    return rows[0] || null;
  }

  /**
   * Function: updatePassword()
   * Description: Updates the hashed password for an admin.
   * Params: id (number), hashedPassword (string)
   * Returns: void
   */
  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await sequelize.query(
      'UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?',
      {
        type: QueryTypes.UPDATE,
        replacements: [hashedPassword, id],
      }
    );
  }

  /**
   * Function: create()
   * Description: Creates a new admin record.
   * Params: name, email, hashedPassword
   * Returns: The newly created Admin object
   * Used: For seeding or initial setup
   */
  async create(name: string, email: string, hashedPassword: string): Promise<Admin> {
    const result = await sequelize.query(
      'INSERT INTO admins (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      {
        type: QueryTypes.INSERT,
        replacements: [name, email, hashedPassword],
      }
    );

    // MySQL: result[0] is insertId
    const insertId = (result as any)[0] as number;

    const admin = await this.findById(insertId);
    if (!admin) throw new Error('Failed to create admin');
    return admin;
  }
}
