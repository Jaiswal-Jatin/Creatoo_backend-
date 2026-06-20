/**
 * Module: Backend (API Server)
 * File Purpose: User Service. Handles direct DB interactions for User/Business/Creator management.
 * Used By: UserController, AuthController
 * API Connected: N/A
 * Database Model: User, Business
 * Critical: Yes
 */
import { Op } from "sequelize";
import User, { UserAttrs } from "../models/User";
import Business, { BusinessAttrs } from "../models/Business";

export class UserService {
  async fetch(id: number) {
    return User.findByPk(id);
  }

  async fetchBusiness(id: number) {
    return Business.findByPk(id);
  }

  async fetchRecord(role: number, fromDate?: string, toDate?: string) {
    const where: any = {};
    if (role !== 2) {
      where.role_id = role;
    }

    if (fromDate && toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);

      where.createdAt = {
        [Op.between]: [new Date(fromDate), endDate],
      };
    }

    if (role === 2) {
      return Business.findAll({ where, order: [["createdAt", "DESC"]] });
    } else {
      return User.findAll({ where, order: [["createdAt", "DESC"]] });
    }
  }

  async fetchInstagramRecord() {
    return User.findAll({
      where: {
        role_id: 3,
        is_insta_verified: { [Op.ne]: 3 },
      },
      order: [["createdAt", "DESC"]],
    });
  }

  async changeStatus(id: number, status: number) {
    const isActive = status === 1;
    const [updated] = await User.update(
      { is_active: isActive },
      { where: { id } }
    );
    return updated > 0;
  }

  async changeBusinessStatus(id: number, status: number) {
    const isActive = status === 1;
    const [updated] = await Business.update(
      { is_active: isActive },
      { where: { id } }
    );
    return updated > 0;
  }

  async updateIsTop(id: number, isTop: boolean | number) {
    const [updated] = await Business.update(
      { is_top: Boolean(isTop) },
      { where: { id } }
    );
    return updated > 0;
  }

  async updateBusiness(id: number, data: Partial<BusinessAttrs>) {
    const [updated] = await Business.update(data, { where: { id } });
    return updated > 0;
  }

  async updateCreator(id: number, data: Partial<UserAttrs>) {
    const [updated] = await User.update(data, { where: { id } });
    return updated > 0;
  }

  async findBusinessByMobile(businessMobile: string) {
    return Business.findOne({
      where: {
        business_mobile: businessMobile,
      },
    });
  }

  async findCreatorByMobile(mobile: string) {
    return User.findOne({
      where: {
        mobile,
        role_id: 3,
      },
    });
  }

  async settingsSnapshot() {
    return {
      // Platform settings - these should be configured in environment or settings table
      platform_fee_percent: 0,
      gateway_charges: 0,
      reverse_gateway_charges: 0,
      min_threshold: 0,
    };
  }

  async upsertBusiness(
    data: Partial<BusinessAttrs> & { business_mobile: string }
  ) {
    let business = await Business.findOne({
      where: { business_mobile: data.business_mobile },
    });

    if (business) {
      await business.update(data);
    } else {
      business = await Business.create(data as BusinessAttrs);
    }

    return business;
  }

  async upsertCreator(data: Partial<UserAttrs> & { mobile: string }) {
    let user = await User.findOne({
      where: { mobile: data.mobile },
    });

    if (user) {
      await user.update(data);
    } else {
      user = await User.create(data as UserAttrs);
    }

    return user;
  }
}

export const userService = new UserService();

export const findBusinessByMobile = (businessMobile: string) =>
  userService.findBusinessByMobile(businessMobile);

export const findCreatorByMobile = (mobile: string) =>
  userService.findCreatorByMobile(mobile);

export const settingsSnapshot = () => userService.settingsSnapshot();

export const upsertBusiness = (
  data: Partial<BusinessAttrs> & { business_mobile: string }
) => userService.upsertBusiness(data);

export const upsertCreator = (
  data: Partial<UserAttrs> & { mobile: string }
) => userService.upsertCreator(data);
