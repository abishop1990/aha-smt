import { differenceInBusinessDays, parseISO } from "date-fns";
import type { AhaFeature } from "./aha-types";

export interface DayOffEntry {
  userId?: string | null;
  isHoliday: boolean;
}

export interface MemberCapacity {
  name: string;
  capacity: number;
  pointsPerDay: number;
  daysOff: number;
}

/**
 * Calculate per-member capacity from sprint dates, feature assignments,
 * days off, and a default points-per-day rate.
 */
export function calculateMemberCapacities(
  startDate: string | null,
  endDate: string | null,
  features: AhaFeature[],
  daysOffList: DayOffEntry[],
  pointsPerDay: number
): Record<string, MemberCapacity> {
  if (!startDate || !endDate) return {};

  const totalBusinessDays = differenceInBusinessDays(
    parseISO(endDate),
    parseISO(startDate)
  );

  // Build a map of userId -> personal days off count
  const daysOffByUser = new Map<string, number>();
  const holidayCount = daysOffList.filter((d) => d.isHoliday).length;

  for (const d of daysOffList) {
    if (d.userId && !d.isHoliday) {
      daysOffByUser.set(d.userId, (daysOffByUser.get(d.userId) || 0) + 1);
    }
  }

  // Build capacity per member from features' assignees
  const members: Record<string, MemberCapacity> = {};

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
      };
    }
  }

  return members;
}
