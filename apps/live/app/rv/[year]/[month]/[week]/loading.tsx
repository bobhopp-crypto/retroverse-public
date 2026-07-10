import { RV_CHRONOLOGY_DEFAULT_YEAR } from "@/lib/rv/rv-chronology-paths";

import { RvChronologyLoading } from "../../../components/rv-chronology-loading";
import { Rv2ChronologyFrame } from "../../../components/rv2-chronology-frame";

export default function RvWeekLoading() {
  return (
    <Rv2ChronologyFrame rvYear={RV_CHRONOLOGY_DEFAULT_YEAR}>
      <RvChronologyLoading rvYear={RV_CHRONOLOGY_DEFAULT_YEAR} shellMode="rv2" />
    </Rv2ChronologyFrame>
  );
}
