import type { AhaFeature, IterationMemberCapacity } from "./aha-types";
import { countBusinessDaysInclusive } from "./date-utils";

export interface DayOffEntry {
  userId?: string | null;
  isHoliday: boolean;
}

export interface MemberCapacity {
  name: string;
  capacity: number;
  pointsPerDay: number;
  daysOff: number;
  /** "aha" when the base capacity came from the Aha iteration team, "local" when computed from points-per-day. */
  source: "aha" | "local";
}

/**
 * Calculate per-member capacity from sprint dates, feature assignments,
 * days off, and a default points-per-day rate.
 *
 * When `ahaMembers` is given (Aha iteration team capacity), every team member is
 * listed with Aha's story points as the base. Locally recorded days off scale that
 * base down, except for members whose non-working days Aha already tracks.
 * Assignees outside the Aha team fall back to points-per-day.
 */
export function calculateMemberCapacities(
  startDate: string | null,
  endDate: string | null,
  features: AhaFeature[],
  daysOffList: DayOffEntry[],
  pointsPerDay: number,
  ahaMembers: IterationMemberCapacity[] = []
): Record<string, MemberCapacity> {
  if (!startDate || !endDate) return {};

  const totalBusinessDays = countBusinessDaysInclusive(startDate, endDate);

  // Build a map of userId -> personal days off count
  const daysOffByUser = new Map<string, number>();
  const holidayCount = daysOffList.filter((d) => d.isHoliday).length;

  for (const d of daysOffList) {
    if (d.userId && !d.isHoliday) {
      daysOffByUser.set(d.userId, (daysOffByUser.get(d.userId) || 0) + 1);
    }
  }

  const members: Record<string, MemberCapacity> = {};

  for (const m of ahaMembers) {
    const userDaysOff = (daysOffByUser.get(m.userId) || 0) + holidayCount;
    const availableDays = Math.max(0, totalBusinessDays - userDaysOff);
    const scale =
      m.hasNonWorkingDays || totalBusinessDays === 0 ? 1 : availableDays / totalBusinessDays;
    const capacity = Math.round(m.storyPoints * scale * 100) / 100;
    members[m.userId] = {
      name: m.name,
      capacity,
      pointsPerDay: totalBusinessDays ? Math.round((m.storyPoints / totalBusinessDays) * 100) / 100 : 0,
      daysOff: m.hasNonWorkingDays ? 0 : userDaysOff,
      source: "aha",
    };
  }

  // Assignees without Aha team capacity use the local points-per-day rate
  for (const f of features) {
    const userId = f.assigned_to_user?.id;
    if (userId && !members[userId]) {
      const userDaysOff = (daysOffByUser.get(userId) || 0) + holidayCount;
      const availableDays = Math.max(0, totalBusinessDays - userDaysOff);
      members[userId] = {
        name: f.assigned_to_user?.name ?? "Unknown",
        capacity: availableDays * pointsPerDay,
        pointsPerDay,
        daysOff: userDaysOff,
        source: "local",
      };
    }
  }

  return members;
}
