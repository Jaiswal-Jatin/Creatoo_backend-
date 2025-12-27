// src/services/admin.service.ts
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

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await sequelize.query(
      'UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?',
      {
        type: QueryTypes.UPDATE,
        replacements: [hashedPassword, id],
      }
    );
  }

  // optional: create admin (for seeding / panel)
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
