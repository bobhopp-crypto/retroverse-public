import type { Metadata } from "next";
import SearchClient from "./search-client";
import "./search.css";

export const metadata: Metadata = {
  title: "Search — Retroverse",
  description: "Search artists, albums, and songs across music history.",
};

export default function SearchPage() {
  return <SearchClient />;
}
