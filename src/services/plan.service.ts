import Plan from "../models/Plan";

export default class PlanService {
  // Get all plans (optionally only active)
  async getPlans(options?: { onlyActive?: boolean }) {
    const where: any = {};
    if (options?.onlyActive) {
      where.is_active = true;
    }

    return Plan.findAll({
      where,
      order: [["id", "DESC"]],
    });
  }

  // If you still need "global plan" somewhere else, this returns active ones (array)
  async getGlobalPlan() {
    return this.getPlans({ onlyActive: true });
  }

  async createGlobalPlan(payload: {
    name: string;
    description?: string | null;
    price: number;
    duration_days: number; // required, no default
    is_active?: boolean;
  }) {
    return Plan.create({
      name: payload.name,
      description: payload.description ?? null,
      price: payload.price,
      duration_days: payload.duration_days,
      is_active:
        typeof payload.is_active === "boolean" ? payload.is_active : true,
    });
  }

  async updatePlan(
    id: number,
    payload: Partial<{
      name: string;
      description: string | null;
      price: number;
      duration_days: number;
      is_active: boolean;
    }>
  ) {
    const plan = await Plan.findByPk(id);
    if (!plan) return null;

    await plan.update(payload);
    return plan;
  }
}
