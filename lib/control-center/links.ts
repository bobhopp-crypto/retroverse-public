import { ARTIST_SLUGS } from "@/lib/artist/slug";
import { welcomeHref } from "@/lib/control-center/welcome-base";

export type ControlLink = {
  label: string;
  href: string;
  note?: string;
  external?: boolean;
};

export type ControlSection = {
  id: string;
  title: string;
  tone: "cream" | "teal" | "orange" | "purple" | "charcoal";
  links: ControlLink[];
};

export const SEARCH_QUICK_LINKS: ControlLink[] = [
  { label: "Madonna", href: "/search?q=Madonna" },
  { label: "Fleetwood Mac", href: "/search?q=Fleetwood%20Mac" },
  { label: "Eagles", href: "/search?q=Eagles" },
  { label: "Prince", href: "/search?q=Prince" },
  { label: "Elton John", href: "/search?q=Elton%20John" },
  { label: "Bruce Springsteen", href: "/search?q=Bruce%20Springsteen" },
  { label: "76", href: "/search?q=76" },
  { label: "84", href: "/search?q=84" },
];

export const ARTIST_ROUTE_LINKS: ControlLink[] = Object.entries(ARTIST_SLUGS).map(
  ([slug, name]) => ({
    label: name,
    href: `/artist/${slug}`,
    note: `/artist/${slug}`,
  }),
);

export const CANONICAL_ALBUM_LINKS: ControlLink[] = [
  {
    label: "Rumours",
    href: "/search?q=Fleetwood%20Mac%20Rumours",
    note: "RVAL000003",
  },
  {
    label: "The Dance",
    href: "/search?q=Fleetwood%20Mac%20The%20Dance",
    note: "RVAL768327",
  },
  {
    label: "Mirage",
    href: "/search?q=Fleetwood%20Mac%20Mirage",
    note: "RVAL106014",
  },
  {
    label: "Thriller",
    href: "/search?q=Michael%20Jackson%20Thriller",
    note: "chart album",
  },
  {
    label: "Rumours (welcome)",
    href: welcomeHref("/albums/RVAL000003"),
    note: "welcome album route",
    external: true,
  },
  {
    label: "The Dance (welcome)",
    href: welcomeHref("/albums/RVAL768327"),
    external: true,
  },
];

export const CONTROL_SECTIONS: ControlSection[] = [
  {
    id: "main",
    title: "Main experience",
    tone: "cream",
    links: [
      { label: "Homepage", href: "/" },
      { label: "Search", href: "/search" },
      { label: "Artist pages", href: "/artist/fleetwood-mac", note: "example" },
      { label: "Album search", href: "/search?q=Rumours", note: "PUBLIC has search-first albums" },
    ],
  },
  {
    id: "search-quick",
    title: "Search quick links",
    tone: "teal",
    links: SEARCH_QUICK_LINKS,
  },
  {
    id: "artists",
    title: "Artist routes",
    tone: "orange",
    links: ARTIST_ROUTE_LINKS,
  },
  {
    id: "albums",
    title: "Album routes",
    tone: "purple",
    links: CANONICAL_ALBUM_LINKS,
  },
  {
    id: "inspectors",
    title: "Inspectors",
    tone: "teal",
    links: [
      { label: "Graph Inspector", href: "/inspect", note: "local PG read-only" },
      { label: "Search results", href: "/search?q=madonna", note: "discovery UI" },
      {
        label: "Missing covers report",
        href: welcomeHref("/integrity"),
        note: "welcome integrity console",
        external: true,
      },
      {
        label: "Cover proxy path",
        href: "/retroverse/covers/RVAL000003/RVAL000003__fleetwood-mac__rumours.jpg",
        note: "dev rewrite → welcome",
      },
    ],
  },
  {
    id: "curation",
    title: "Curation",
    tone: "orange",
    links: [
      {
        label: "Integrity console",
        href: welcomeHref("/integrity"),
        external: true,
      },
      {
        label: "Album Retroscope",
        href: welcomeHref("/album-retroscope"),
        external: true,
      },
      {
        label: "Track deck",
        href: welcomeHref("/track-deck"),
        external: true,
      },
      {
        label: "Site index",
        href: welcomeHref("/site-index"),
        note: "welcome TOC",
        external: true,
      },
    ],
  },
];
