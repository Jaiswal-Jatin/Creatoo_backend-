/**
 * Module: Backend (API Server)
 * File Purpose: Business Type Service. Manages categories for businesses (e.g., Food, Fashion).
 * Used By: BusinessTypeController
 * Database Model: BusinessType
 * Critical: No
 */
import BusinessType from '../models/BusinessType';

export default class BusinessTypeService {
  findById(id: number) {
    return BusinessType.findByPk(id);
  }

  async create(data: { title: string; image?: string | null }) {
    return BusinessType.create({
      title: data.title,
      image: data.image ?? null,
      is_active: true,
    });
  }

  async fetchRecord() {
    return BusinessType.findAll({ order: [['id', 'DESC']] });
  }

  async editBusinessType(id: number, data: Partial<{ title: string; image: string }>) {
    const record = await BusinessType.findByPk(id);
    if (!record) return null;

    if (data.title) record.title = data.title;
    if (data.image) record.image = data.image;

    await record.save();
    return record;
  }

  async delete(id: number) {
    const record = await BusinessType.findByPk(id);
    if (!record) return null;
    await record.destroy();
    return record;
  }

  async changeStatus(id: number, status: number) {
    return BusinessType.update({ is_active: status === 1 }, { where: { id } });
  }
}
