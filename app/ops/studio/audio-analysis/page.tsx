import {
  StudioDepartmentPage,
  studioDepartmentMetadata,
} from "@/components/ops/studio/StudioDepartmentPage";

export const dynamic = "force-dynamic";

export const metadata = studioDepartmentMetadata("audio-analysis");

export default function AudioAnalysisDepartmentPage() {
  return <StudioDepartmentPage slug="audio-analysis" />;
}
