import { notFound } from "next/navigation";

import { PublicV3ReviewStudio } from "./public-v3-review-studio";

import "./public-v3-review.css";

export const dynamic = "force-dynamic";

export default function PublicV3ReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PublicV3ReviewStudio />;
}
