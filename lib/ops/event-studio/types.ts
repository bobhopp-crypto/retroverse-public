export type EventStudioSection =
  | "overview"
  | "branding"
  | "print"
  | "digital"
  | "giveaway"
  | "assets"
  | "ai"
  | "settings";

export type EventStudioStatus = "Planning" | "Live" | "Archived";

export type EventStudioSnapshot = {
  eventName: string;
  venue: string;
  date: string;
  theme: string;
  featuredYears: number[];
  status: EventStudioStatus;
  updatedAt: string;
};

export type EventStudioNavItem = {
  id: EventStudioSection;
  label: string;
  href: string;
  description?: string;
};

export type EventStudioToolCard = {
  id: string;
  title: string;
  description: string;
  href?: string;
  status: "active" | "planned";
  badge?: string;
};
