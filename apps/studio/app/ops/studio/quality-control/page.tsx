import {
  StudioDepartmentPage,
  studioDepartmentMetadata,
} from "@/components/ops/studio/StudioDepartmentPage";

export const dynamic = "force-dynamic";

export const metadata = studioDepartmentMetadata("quality-control");

export default function QualityControlDepartmentPage() {
  return <StudioDepartmentPage slug="quality-control" />;
}
