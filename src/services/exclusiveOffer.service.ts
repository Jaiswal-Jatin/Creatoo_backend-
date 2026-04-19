/**
 * Module: Backend (API Server)
 * File Purpose: Exclusive Offer Service. Manages business-specific tier-based offers.
 * Used By: ExclusiveOfferController
 * Database Model: ExclusiveOffer
 * Critical: Yes (Marketing/Loyalty)
 */
import ExclusiveOffer from "../models/ExclusiveOffer";

export default class ExclusiveOfferService {
  async fetchAll() {
    return ExclusiveOffer.findAll();
  }

  async findById(id: number) {
    return ExclusiveOffer.findByPk(id);
  }

  async findByBusinessId(businessId: number) {
    return ExclusiveOffer.findOne({ where: { business_id: businessId } });
  }

  async create(data: {
    business_id: number;
    premium?: string[] | null;
    elite?: string[] | null;
    core?: string[] | null;
    is_active?: boolean;
  }) {
    return ExclusiveOffer.create(data as any);
  }

  async updateByBusinessId(
    businessId: number,
    data: {
      premium?: string[] | null;
      elite?: string[] | null;
      core?: string[] | null;
      is_active?: boolean;
    }
  ) {
    const record = await this.findByBusinessId(businessId);
    if (!record) return null;
    return record.update(data as any);
  }

  async createOrUpdateByBusinessId(
    businessId: number,
    data: {
      premium?: string[] | null;
      elite?: string[] | null;
      core?: string[] | null;
      is_active?: boolean;
    }
  ) {
    const existing = await this.findByBusinessId(businessId);

    if (existing) {
      const updated = await existing.update(data as any);
      return { record: updated, created: false };
    }

    const created = await this.create({
      business_id: businessId,
      ...data,
    });
    return { record: created, created: true };
  }
}
