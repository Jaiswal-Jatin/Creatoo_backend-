/**
 * Module: Backend (API Server)
 * File Purpose: Banner Service. Handles logic for promotional banners.
 * Used By: BannerController
 * Database Model: Banner
 * Critical: No
 */
import Banner from "../models/Banner";

export default class BannerService {
  findById(id: number) {
    return Banner.findByPk(id);
  }

  async create(payload: { image?: string; link?: string }) {
    return Banner.create({
      image: payload.image ?? null,
      link: payload.link ?? null,
      is_active: true,
    });
  }

  fetchRecord() {
    return Banner.findAll({ order: [["id", "DESC"]] });
  }

  fetch(id: number) {
    return Banner.findByPk(id);
  }

  async editBanner(id: number, data: { image?: string; link?: string }) {
    const banner = await Banner.findByPk(id);
    if (!banner) return null;

    if (typeof data.image !== "undefined") banner.image = data.image;
    if (typeof data.link !== "undefined") banner.link = data.link;

    await banner.save();
    return banner;
  }

  async delete(id: number) {
    const banner = await Banner.findByPk(id);
    if (!banner) return null;
    await banner.destroy();
    return banner;
  }

  changeStatus(id: number, status: number) {
    return Banner.update({ is_active: status === 1 }, { where: { id } });
  }
}
