import {
  StudioDepartmentPage,
  studioDepartmentMetadata,
} from "@/components/ops/studio/StudioDepartmentPage";

export const dynamic = "force-dynamic";

export const metadata = studioDepartmentMetadata("director");

export default function DirectorDepartmentPage() {
  return <StudioDepartmentPage slug="director" />;
}
