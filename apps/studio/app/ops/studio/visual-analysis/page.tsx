import {
  StudioDepartmentPage,
  studioDepartmentMetadata,
} from "@/components/ops/studio/StudioDepartmentPage";

export const dynamic = "force-dynamic";

export const metadata = studioDepartmentMetadata("visual-analysis");

export default function VisualAnalysisDepartmentPage() {
  return <StudioDepartmentPage slug="visual-analysis" />;
}
