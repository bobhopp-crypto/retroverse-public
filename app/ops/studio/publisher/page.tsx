import {
  StudioDepartmentPage,
  studioDepartmentMetadata,
} from "@/components/ops/studio/StudioDepartmentPage";

export const dynamic = "force-dynamic";

export const metadata = studioDepartmentMetadata("publisher");

export default function PublisherDepartmentPage() {
  return <StudioDepartmentPage slug="publisher" />;
}
