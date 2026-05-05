import { useQuery } from "@tanstack/react-query";
import { getDb } from "./index";
import { sql } from "kysely";

export const gamificationKeys = {
  all: ["gamification"] as const,
  xpByAttribute: () => [...gamificationKeys.all, "xp-by-attribute"] as const,
  dailyFocus: (days: number) => [...gamificationKeys.all, "daily-focus", days] as const,
  streak: () => [...gamificationKeys.all, "streak"] as const,
  globalStats: () => [...gamificationKeys.all, "global-stats"] as const,
};

export function useXpByAttribute() {
  return useQuery({
    queryKey: gamificationKeys.xpByAttribute(),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("xp_ledger")
        .select([
          "rpg_attribute",
          sql<number>`SUM(xp_awarded)`.as("total")
        ])
        .groupBy("rpg_attribute")
        .execute();
    },
  });
}

export function useDailyFocusMinutes(days: number) {
  return useQuery({
    queryKey: gamificationKeys.dailyFocus(days),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("focus_sessions")
        .select([
          sql<string>`DATE(start_time, 'localtime')`.as("day"),
          sql<number>`SUM(focus_duration_seconds) / 60.0`.as("mins")
        ])
        .groupBy("day")
        .orderBy("day", "desc")
        .limit(days)
        .execute();
    },
  });
}

export function useStreak() {
  return useQuery({
    queryKey: gamificationKeys.streak(),
    queryFn: async () => {
      const db = getDb();
      
      // 1. Read streak_threshold_minutes from user_settings
      const settings = await db
        .selectFrom("user_settings")
        .select(["value"])
        .where("key", "=", "streak_threshold_minutes")
        .executeTakeFirst();
      
      const threshold = settings ? parseInt(settings.value, 10) : 60;
      
      // 2. Fetch daily focus minutes for the last 365 days
      const dailyMinutes = await db
        .selectFrom("focus_sessions")
        .select([
          sql<string>`DATE(start_time, 'localtime')`.as("day"),
          sql<number>`SUM(focus_duration_seconds) / 60.0`.as("mins")
        ])
        .groupBy("day")
        .orderBy("day", "desc")
        .limit(365)
        .execute();
      
      if (dailyMinutes.length === 0) return 0;
      
      // 3. Compute current streak
      const today = new Date().toLocaleDateString('en-CA');
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toLocaleDateString('en-CA');
      
      const minutesMap = new Map(dailyMinutes.map(m => [m.day, m.mins]));
      
      let checkDateStr = "";
      if ((minutesMap.get(today) || 0) >= threshold) {
        checkDateStr = today;
      } else if ((minutesMap.get(yesterday) || 0) >= threshold) {
        checkDateStr = yesterday;
      } else {
        return 0;
      }
      
      let streak = 0;
      let current = new Date(checkDateStr);
      
      while (true) {
        const dateStr = current.toLocaleDateString('en-CA');
        const mins = minutesMap.get(dateStr) || 0;
        if (mins >= threshold) {
          streak++;
          current.setDate(current.getDate() - 1);
        } else {
          break;
        }
      }
      
      return streak;
    },
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: gamificationKeys.globalStats(),
    queryFn: async () => {
      const db = getDb();
      
      const totalFocus = await db
        .selectFrom("focus_sessions")
        .select(sql<number>`SUM(focus_duration_seconds) / 60.0`.as("total_mins"))
        .executeTakeFirst();
        
      const weeklyFocus = await db
        .selectFrom("focus_sessions")
        .select(sql<number>`SUM(focus_duration_seconds) / 60.0`.as("weekly_mins"))
        .where("start_time", ">=", sql<string>`date('now', 'weekday 0', '-6 days')`)
        .executeTakeFirst();
        
      const totalXp = await db
        .selectFrom("xp_ledger")
        .select(sql<number>`SUM(xp_awarded)`.as("total_xp"))
        .executeTakeFirst();
        
      const topAttribute = await db
        .selectFrom("xp_ledger")
        .select([
          "rpg_attribute",
          sql<number>`SUM(xp_awarded)`.as("total")
        ])
        .groupBy("rpg_attribute")
        .orderBy("total", "desc")
        .executeTakeFirst();
        
      return {
        totalFocusMinutes: totalFocus?.total_mins || 0,
        weeklyFocusMinutes: weeklyFocus?.weekly_mins || 0,
        totalXp: totalXp?.total_xp || 0,
        topAttribute: topAttribute?.rpg_attribute || "None"
      };
    },
  });
}
