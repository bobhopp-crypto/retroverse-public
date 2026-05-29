import OpsConsoleClient from "@/components/ops/OpsConsoleClient";
import type {
  AcquisitionRow,
  OpsActivityRow,
  WeeklyRefreshStatus,
  YearMatchRow,
} from "@/lib/ops/types";

export function OpsBoard(props: {
  year: number;
  yearMatch: YearMatchRow[];
  acquisition: AcquisitionRow[];
  weeklyRefresh: WeeklyRefreshStatus;
  recentActivity: OpsActivityRow[];
  yearStats?: { chartRows: number; matched: number; missing: number };
}) {
  return <OpsConsoleClient {...props} />;
}
