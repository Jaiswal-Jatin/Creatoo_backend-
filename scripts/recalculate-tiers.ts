import sequelize from "./src/db/sequelize";
import Visit from "./src/models/Visit";
import BusinessAssociate from "./src/models/BusinessAssociate";
import { Op } from "sequelize";

/**
 * Utility script to recalculate visit tiers based on corrected associate network logic
 * Run this to fix historical tier data after updating the getAssociateNetwork method
 */

type VisitTier = "new" | "core" | "elite" | "premium";

async function getAssociateNetwork(businessId: number): Promise<number[]> {
  const visited = new Set<number>();
  const toProcess = [businessId];

  while (toProcess.length > 0) {
    const currentId = toProcess.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Get all direct associates (where current is parent)
    const associates = await BusinessAssociate.findAll({
      where: { parent_business_id: currentId },
      attributes: ["associate_business_id"],
    });

    // Get all parent businesses (where current is associate)
    const parents = await BusinessAssociate.findAll({
      where: { associate_business_id: currentId },
      attributes: ["parent_business_id"],
    });

    // Add to processing queue
    associates.forEach((a: any) => {
      if (!visited.has(a.associate_business_id)) {
        toProcess.push(a.associate_business_id);
      }
    });

    parents.forEach((p: any) => {
      if (!visited.has(p.parent_business_id)) {
        toProcess.push(p.parent_business_id);
      }
    });
  }

  return Array.from(visited);
}

function calculateTier(lastVisit: any): VisitTier {
  if (!lastVisit) return "new";

  const now = Date.now();
  const last = lastVisit.time.getTime();
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return "premium";
  if (diffDays <= 15) return "elite";
  return "core";
}

async function recalculateVisitTiers() {
  try {
    console.log("Starting tier recalculation...");

    // Get all visits, grouped by business
    const allVisits = await Visit.findAll({
      order: [["business_id", "ASC"], ["time", "DESC"]],
    });

    const visitsByBusiness = new Map<number, any[]>();
    allVisits.forEach((v) => {
      if (!visitsByBusiness.has(v.business_id)) {
        visitsByBusiness.set(v.business_id, []);
      }
      visitsByBusiness.get(v.business_id)!.push(v);
    });

    let updatedCount = 0;
    let businessCount = 0;

    // For each business
    for (const [businessId, visits] of visitsByBusiness) {
      businessCount++;
      
      const network = await getAssociateNetwork(businessId);
      console.log(
        `\nProcessing business ${businessId} (network size: ${network.length})`
      );

      // Get all visits across the network
      const networkVisits = await Visit.findAll({
        where: { business_id: { [Op.in]: network } },
        order: [["time", "DESC"]],
      });

      // Process each visit for this business and calculate correct tier
      for (const visit of visits) {
        // Find all visits to this card number across the network that happened BEFORE this visit
        const previousVisits = networkVisits.filter(
          (v) =>
            v.card_number === visit.card_number && v.time < visit.time
        );

        const lastVisit = previousVisits.length > 0 ? previousVisits[0] : null;
        const correctTier = calculateTier(lastVisit);

        if (visit.tier !== correctTier) {
          console.log(
            `  Card ${visit.card_number}: ${visit.tier} -> ${correctTier} (${
              lastVisit
                ? Math.floor(
                    (visit.time.getTime() - lastVisit.time.getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + " days since last visit"
                : "first visit"
            })`
          );

          await visit.update({ tier: correctTier });
          updatedCount++;
        }
      }
    }

    console.log(
      `\n✓ Tier recalculation complete. Updated ${updatedCount} visits across ${businessCount} businesses.`
    );
    process.exit(0);
  } catch (err) {
    console.error("Error recalculating tiers:", err);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  recalculateVisitTiers();
}

export { recalculateVisitTiers };
