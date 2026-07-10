import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Artist routes supply their own Rv2 shell on the hub page; sub-routes keep legacy sections. */
export default function ArtistSlugLayout({ children }: Props) {
  return children;
}
