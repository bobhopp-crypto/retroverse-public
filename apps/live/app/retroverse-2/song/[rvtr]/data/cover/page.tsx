import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export default async function CoverCorrectionPage({ params }: Props) {
  const { rvtr } = await params;
  redirect(`/retroverse-2/song/${rvtr}/data`);
}
