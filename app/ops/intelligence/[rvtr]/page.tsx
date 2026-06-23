import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ rvtr: string }>;
};

/** Legacy review route — redirect to package discovery viewer. */
export default async function IntelligenceLegacyReviewRedirect({ params }: Props) {
  const { rvtr } = await params;
  redirect(`/ops/intelligence?rvtr=${rvtr.trim().toUpperCase()}#gallery`);
}
