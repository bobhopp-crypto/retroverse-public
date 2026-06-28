import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { LabLayoutId } from "@/lib/retroverse/experience-lab/types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";

import {
  describeColor,
  fallbackPalette,
  luminance,
  mix,
} from "./color-utils";
import { extractRenderSpecSignals } from "./render-spec-signals";
import type {
  ArtDirectionChoice,
  ArtDirectionProfile,
  ArtDirectionTypography,
} from "./types";

type BuildInput = {
  songDna: CollectorSongDna | null;
  experience?: ParsedExperience | null;
  layoutId: LabLayoutId;
  rvtr: string;
};

const EMPTY_SIGNALS = {
  sceneCount: 0,
  totalDurationSec: 0,
  imageCount: 0,
  factCount: 0,
  timelineEventCount: 0,
  hasPerformanceImagery: false,
  hasTimelineScenes: false,
  dominantTemplate: "hero",
};

function choice<T extends string>(
  value: T,
  label: string,
  reason: string,
  dnaSources: string[],
): ArtDirectionChoice<T> {
  return { value, label, reason, dnaSources };
}

function normalizeToken(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function includesAny(haystack: string, needles: string[]): boolean {
  const n = normalizeToken(haystack);
  return needles.some((needle) => n.includes(normalizeToken(needle)));
}

function resolvePaletteColors(dna: CollectorSongDna | null, rvtr: string) {
  const visual = dna?.visual;
  const fb = fallbackPalette(rvtr);

  let primary = visual?.primaryColor?.startsWith("#") ? visual.primaryColor : fb.primary;
  let secondary = visual?.secondaryColor?.startsWith("#") ? visual.secondaryColor : fb.secondary;
  let accent = visual?.accentColor?.startsWith("#") ? visual.accentColor : fb.accent;

  if (luminance(primary) < 0.06 && visual?.dominantPalette?.length) {
    const midTone = visual.dominantPalette.find(
      (color) => color.startsWith("#") && luminance(color) > 0.08 && luminance(color) < 0.55,
    );
    if (midTone) {
      secondary = primary;
      primary = midTone;
    }
  }

  return { primary, secondary, accent };
}

function musicalValenceLabel(dna: CollectorSongDna | null): string {
  return dna?.musical?.valence?.label ?? "";
}

function musicalEnergyLabel(dna: CollectorSongDna | null): string {
  return dna?.musical?.energy?.label ?? "";
}

function typographyFromDna(dna: CollectorSongDna | null): ArtDirectionTypography {
  const visual = dna?.visual;
  const experience = dna?.experience;
  const story = dna?.story;
  const valence = musicalValenceLabel(dna);
  const energy = musicalEnergyLabel(dna);

  const style = visual?.typographyStyle ?? experience?.preferredLayoutStyle ?? "editorial";
  const styleNorm = normalizeToken(style);

  let characteristic: ArtDirectionChoice;
  let fontStack: string;
  let weight: ArtDirectionChoice;
  let tracking: ArtDirectionChoice;

  if (includesAny(story?.emotionalArc ?? "", ["triumph"])) {
    characteristic = choice(
      "bold",
      "Bold Sans",
      "Triumph emotional arc calls for celebratory headline weight.",
      ["story.emotionalArc", "musical.valence"],
    );
    fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    weight = choice("heavy", "Heavy weight", "Triumph arc pairs with high-impact sans.", [
      "story.emotionalArc",
    ]);
    tracking = choice("tight", "Tight tracking", "Chart-triumph energy compresses headline rhythm.", [
      "story.emotionalArc",
      "experience.readingPace",
    ]);
  } else if (styleNorm.includes("cinematic") || includesAny(story?.emotionalArc ?? "", ["breakthrough"])) {
    characteristic = choice(
      "cinematic",
      "Cinematic Serif",
      "Slow dramatic narrative and filmic visual identity.",
      ["visual.typographyStyle", "experience.preferredLayoutStyle"],
    );
    fontStack = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
    weight = choice("medium", "Medium weight", "Cinematic pacing favors readable body weight.", [
      "experience.readingPace",
    ]);
    tracking = choice("normal", "Normal tracking", "Serif headlines carry drama without compression.", [
      "visual.typographyStyle",
    ]);
  } else if (includesAny(story?.emotionalArc ?? "", ["performance"]) && includesAny(energy, ["high"])) {
    characteristic = choice(
      "condensed",
      "Condensed Sans",
      "Performance-driven arc with high energy favors compact headlines.",
      ["story.emotionalArc", "musical.energy"],
    );
    fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    weight = choice("bold", "Bold weight", "Live performance energy needs bold condensed type.", [
      "musical.energy",
    ]);
    tracking = choice("tight", "Tight tracking", "High-energy performance compresses typographic rhythm.", [
      "musical.energy",
      "experience.readingPace",
    ]);
  } else if (styleNorm.includes("bold")) {
    characteristic = choice("bold", "Bold Sans", "High visual energy calls for assertive headline typography.", [
      "visual.typographyStyle",
      "experience.visualEnergy",
    ]);
    fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    weight = choice("heavy", "Heavy weight", "Bold sans matches kinetic energy.", ["experience.visualEnergy"]);
    tracking = choice("tight", "Tight tracking", "Condensed headlines for impact.", ["experience.visualEnergy"]);
  } else if (styleNorm.includes("minimal")) {
    characteristic = choice("minimal", "Minimal System", "Restrained experience favors system clarity.", [
      "visual.typographyStyle",
      "experience.readingPace",
    ]);
    fontStack = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    weight = choice("regular", "Regular weight", "Minimal layouts need quiet typography.", ["experience.readingPace"]);
    tracking = choice("normal", "Normal tracking", "System fonts read best at default spacing.", [
      "experience.readingPace",
    ]);
  } else if (styleNorm.includes("retro") || styleNorm.includes("playful")) {
    characteristic = choice("playful", "Playful Mono", "Retro texture and collectible tone.", [
      "visual.typographyStyle",
      "visual.visualTexture",
    ]);
    fontStack = '"Courier New", Courier, monospace';
    weight = choice("medium", "Medium weight", "Monospace badges suit collectible framing.", [
      "visual.visualTexture",
    ]);
    tracking = choice("wide", "Wide tracking", "Retro labels breathe with letter spacing.", [
      "visual.visualTexture",
    ]);
  } else if (styleNorm.includes("condensed")) {
    characteristic = choice("condensed", "Condensed Sans", "Brisk reading pace needs compact headlines.", [
      "experience.readingPace",
      "visual.typographyStyle",
    ]);
    fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    weight = choice("bold", "Bold weight", "Condensed headlines anchor fast scenes.", ["experience.readingPace"]);
    tracking = choice("tight", "Tight tracking", "Brisk pace compresses typographic rhythm.", [
      "experience.readingPace",
    ]);
  } else {
    characteristic = choice(
      "editorial",
      "Editorial Serif",
      includesAny(story?.emotionalArc ?? "", ["slow", "reflect", "dramatic"])
        ? "Slow dramatic narrative suits editorial serif treatment."
        : "Magazine-style layout preference maps to editorial typography.",
      ["visual.typographyStyle", "story.emotionalArc", "experience.preferredLayoutStyle"],
    );
    fontStack = '"Iowan Old Style", Georgia, "Times New Roman", serif';
    weight = choice(
      includesAny(experience?.visualEnergy ?? "", ["high", "kinetic"]) || includesAny(valence, ["bright"])
        ? "bold"
        : "medium",
      includesAny(experience?.visualEnergy ?? "", ["high", "kinetic"]) || includesAny(valence, ["bright"])
        ? "Bold weight"
        : "Medium weight",
      includesAny(valence, ["bright"])
        ? "Bright valence lifts headline weight."
        : includesAny(experience?.visualEnergy ?? "", ["high", "kinetic"])
          ? "High energy pushes headline weight up."
          : "Measured energy keeps editorial elegance.",
      ["experience.visualEnergy", "musical.valence"],
    );
    tracking = choice(
      includesAny(experience?.readingPace ?? "", ["leisurely"]) ? "wide" : "normal",
      includesAny(experience?.readingPace ?? "", ["leisurely"]) ? "Wide tracking" : "Normal tracking",
      includesAny(experience?.readingPace ?? "", ["leisurely"])
        ? "Leisurely pace opens typographic breathing room."
        : "Standard editorial rhythm.",
      ["experience.readingPace"],
    );
  }

  return { characteristic, fontStack, weight, tracking };
}

function buildColorSystem(
  dna: CollectorSongDna | null,
  layoutId: LabLayoutId,
  rvtr: string,
) {
  const visual = dna?.visual;
  const experience = dna?.experience;
  const valence = musicalValenceLabel(dna);
  const { primary, secondary, accent: baseAccent } = resolvePaletteColors(dna, rvtr);
  const accent = includesAny(valence, ["bright"])
    ? mix(baseAccent, "#FFFFFF", 0.12)
    : includesAny(valence, ["dark"])
      ? mix(baseAccent, "#000000", 0.15)
      : baseAccent;
  const highlight = mix(accent, "#FFFFFF", luminance(accent) < 0.45 ? 0.35 : 0.15);

  const isDarkVisual = visual?.brightness === "dark" || luminance(primary) < 0.35;
  const isBrightVisual = visual?.brightness === "bright" || luminance(primary) > 0.72;

  let background = primary;
  let surface = secondary;

  if (layoutId === "magazine") {
    background = isDarkVisual ? mix(primary, accent, 0.82) : mix(primary, "#FFFFFF", 0.88);
    surface = mix(background, accent, 0.08);
  } else if (layoutId === "documentary" || layoutId === "performance") {
    background = isBrightVisual ? mix(secondary, "#000000", 0.78) : mix(primary, "#000000", 0.72);
    surface = mix(background, accent, 0.12);
  } else if (layoutId === "collector") {
    background = mix(primary, secondary, 0.35);
    surface = mix(background, accent, 0.15);
  } else if (layoutId === "timeline") {
    background = mix(primary, accent, 0.75);
    surface = mix(background, secondary, 0.2);
  } else if (layoutId === "minimal") {
    background = isDarkVisual ? mix(primary, "#000000", 0.88) : mix(primary, "#FFFFFF", 0.94);
    surface = background;
  }

  const contrastStrategy =
    visual?.contrast === "high" || isDarkVisual
      ? choice(
          "high_contrast",
          "High contrast",
          isDarkVisual
            ? "Dark dominant palette needs strong text separation."
            : "Song DNA specifies high contrast treatment.",
          ["visual.brightness", "visual.contrast"],
        )
      : choice(
          "balanced",
          "Balanced contrast",
          `Recommended color family (${experience?.recommendedColorFamily ?? "balanced"}) favors readable midtones.`,
          ["experience.recommendedColorFamily", "visual.brightness"],
        );

  const lightingReason = visual?.lightingStyle
    ? `Dominant ${visual.lightingStyle.replace(/_/g, " ")} lighting.`
    : `Derived from ${experience?.recommendedColorFamily ?? "Song DNA palette"}.`;

  return {
    background: choice(
      background,
      describeColor(background),
      `${lightingReason} ${layoutId} layout adjusts surface treatment.`,
      ["visual.lightingStyle", "visual.primaryColor", "experience.recommendedColorFamily"],
    ),
    surface: choice(
      surface,
      describeColor(surface),
      `Surface lifts content from ${describeColor(background).toLowerCase()} background.`,
      ["visual.secondaryColor", "visual.primaryColor"],
    ),
    accent: choice(
      accent,
      describeColor(accent),
      "Accent pulled from Song DNA visual identity.",
      ["visual.accentColor"],
    ),
    highlight: choice(
      highlight,
      describeColor(highlight),
      includesAny(valence, ["bright", "dark"])
        ? `${valence} valence shifts highlight temperature.`
        : "Highlight derived from accent for emphasis moments.",
      ["visual.accentColor", "visual.brightness", "musical.valence"],
    ),
    contrastStrategy,
    swatches: { background, surface, accent, highlight, palettePrimary: primary, paletteSecondary: secondary },
  };
}

function buildComposition(
  dna: CollectorSongDna | null,
  layoutId: LabLayoutId,
  signals: ReturnType<typeof extractRenderSpecSignals>,
) {
  const experience = dna?.experience;
  const visual = dna?.visual;
  const pace = experience?.readingPace ?? "Measured";
  const energy = experience?.visualEnergy ?? "";
  const valence = musicalValenceLabel(dna);

  const imageRatio = signals.imageCount / Math.max(signals.sceneCount, 1);
  const imageDominance =
    layoutId === "performance" || layoutId === "minimal"
      ? choice("dominant", "Dominant", "Performance and minimal layouts center imagery.", ["experience.preferredLayoutStyle"])
      : imageRatio >= 1.5 || includesAny(energy, ["high", "kinetic"])
        ? choice("dominant", "Dominant", "High visual energy and rich imagery push photography forward.", [
            "experience.visualEnergy",
          ])
        : choice("balanced", "Balanced", "Editorial balance between headline and photography.", [
            "experience.visualEnergy",
            "experience.preferredLayoutStyle",
          ]);

  const textDensity =
    signals.factCount >= signals.sceneCount * 2
      ? choice("dense", "Dense", "Director spec carries multiple facts per scene.", [])
      : includesAny(pace, ["brisk"])
        ? choice("compact", "Compact", "Brisk reading pace favors tighter copy blocks.", ["experience.readingPace"])
        : choice("moderate", "Moderate", "Measured pace allows comfortable text density.", ["experience.readingPace"]);

  const whiteSpace =
    includesAny(pace, ["leisurely"])
      ? choice("generous", "Generous", "Low-energy reflective experience opens layout breathing room.", [
          "experience.readingPace",
        ])
      : includesAny(pace, ["brisk"]) && !includesAny(valence, ["bright"])
        ? choice("tight", "Tight", "Brisk pace compresses vertical rhythm.", ["experience.readingPace"])
        : includesAny(valence, ["bright"])
          ? choice("balanced", "Balanced", "Bright valence keeps triumph layouts airy despite brisk pace.", [
              "musical.valence",
              "experience.readingPace",
            ])
          : choice("balanced", "Balanced", "Measured reading pace uses balanced whitespace.", [
              "experience.readingPace",
            ]);

  const cardTreatmentByLayout: Record<LabLayoutId, ArtDirectionChoice> = {
    magazine: choice("editorial", "Editorial spread", "Magazine layout uses open editorial framing.", [
      "experience.preferredLayoutStyle",
    ]),
    documentary: choice("cinematic", "Cinematic frame", "Documentary layout favors widescreen caption bands.", [
      "experience.preferredLayoutStyle",
    ]),
    performance: choice("immersive", "Immersive bleed", "Performance companion minimizes chrome.", [
      "experience.preferredLayoutStyle",
    ]),
    collector: choice("framed", "Framed card", "Collector edition uses badge and stat framing.", [
      "experience.preferredLayoutStyle",
    ]),
    timeline: choice("chronology", "Chronology rail", "Timeline layout anchors events on a vertical rail.", [
      "experience.preferredLayoutStyle",
    ]),
    minimal: choice("single_focus", "Single focus", "Minimal layout isolates one idea per scene.", [
      "experience.preferredLayoutStyle",
    ]),
  };

  const framingStyle = includesAny(visual?.stageAtmosphere ?? "", ["broadcast"])
    ? choice("broadcast", "Broadcast frame", "Broadcast stage atmosphere suggests TV-safe framing.", [
        "visual.stageAtmosphere",
      ])
    : includesAny(visual?.stageAtmosphere ?? "", ["smoke"])
      ? choice("haze", "Haze vignette", "Stage smoke atmosphere calls for soft vignette framing.", [
          "visual.stageAtmosphere",
        ])
      : includesAny(visual?.stageAtmosphere ?? "", ["live_house"])
        ? choice("club", "Club stage frame", "Live house atmosphere suits intimate club framing.", [
            "visual.stageAtmosphere",
          ])
        : includesAny(visual?.lightingStyle ?? "", ["television", "broadcast"])
          ? choice("broadcast", "Broadcast frame", "Television lighting suggests broadcast-safe framing.", [
              "visual.lightingStyle",
            ])
          : includesAny(visual?.lightingStyle ?? "", ["stage", "concert", "warm"])
            ? choice("stage", "Stage frame", "Stage atmosphere calls for performance-forward framing.", [
                "visual.stageAtmosphere",
                "visual.lightingStyle",
              ])
            : includesAny(visual?.cameraEnergy ?? "", ["static", "still"])
              ? choice("gallery", "Gallery mat", "Static camera energy suits gallery-like matting.", [
                  "visual.cameraEnergy",
                ])
              : choice("poster", "Poster crop", "Default Retroverse poster-like crop.", ["visual.cameraEnergy"]);

  return {
    imageDominance,
    textDensity,
    whiteSpace,
    cardTreatment: cardTreatmentByLayout[layoutId],
    framingStyle,
  };
}

function buildMotion(
  dna: CollectorSongDna | null,
  layoutId: LabLayoutId,
  signals: ReturnType<typeof extractRenderSpecSignals>,
) {
  const experience = dna?.experience;
  const energy = experience?.visualEnergy ?? "";
  const motionRec = experience?.recommendedMotionStyle ?? "";
  const rhythm = experience?.sceneRhythm ?? "steady";

  const layoutMotion: Record<LabLayoutId, string> = {
    magazine: "Magazine",
    documentary: "Documentary",
    performance: "Performance",
    collector: "Static",
    timeline: "Documentary",
    minimal: "Static",
  };

  let baseProfile: string;
  let reason: string;

  if (includesAny(motionRec, ["dynamic", "transition"])) {
    baseProfile = includesAny(energy, ["high", "kinetic"]) ? "Dynamic" : "Gentle";
    reason = `Recommended motion (${motionRec}) tempered by ${energy || "visual energy"}.`;
  } else if (includesAny(energy, ["still", "low"])) {
    baseProfile = "Static";
    reason = "Low visual energy favors static presentation.";
  } else if (includesAny(energy, ["high", "kinetic"])) {
    baseProfile = "Dynamic";
    reason = "High kinetic energy supports dynamic motion planning.";
  } else {
    baseProfile = "Gentle";
    reason = "Measured energy suits gentle transitions.";
  }

  const layoutLabel = layoutMotion[layoutId];
  const profileLabel =
    layoutLabel === "Static" || layoutLabel === "Performance"
      ? layoutLabel
      : `${baseProfile} · ${layoutLabel}`;

  return {
    profile: choice(
      normalizeToken(profileLabel),
      profileLabel,
      `${reason} ${layoutId} layout steers motion vocabulary.`,
      ["experience.recommendedMotionStyle", "experience.visualEnergy"],
    ),
    sceneRhythm: choice(
      normalizeToken(rhythm),
      rhythm.replace(/_/g, " "),
      signals.sceneCount <= 2
        ? "Sparse Director scene count keeps rhythm simple."
        : "Scene rhythm from Song DNA experience strand.",
      ["experience.sceneRhythm"],
    ),
  };
}

function buildVisualMotifs(dna: CollectorSongDna | null, layoutId: LabLayoutId): ArtDirectionChoice[] {
  const visual = dna?.visual;
  const story = dna?.story;
  const motifs: ArtDirectionChoice[] = [];

  const lighting = visual?.lightingStyle ?? "";
  if (includesAny(story?.primaryTheme ?? "", ["chart"])) {
    motifs.push(
      choice("chart_ephemera", "Chart ephemera", "Chart success theme supports chart-run motifs.", [
        "story.primaryTheme",
      ]),
    );
  }
  if (includesAny(story?.primaryTheme ?? "", ["performance"])) {
    motifs.push(
      choice("live_poster", "Live posters", "Performance-first story angle suits gig-poster motifs.", [
        "story.primaryTheme",
      ]),
    );
  }
  if (includesAny(lighting, ["television", "broadcast"])) {
    motifs.push(
      choice("tv_scan", "Television scan lines", "Television lighting style in visual DNA.", [
        "visual.lightingStyle",
      ]),
    );
    motifs.push(
      choice("broadcast_gfx", "Broadcast graphics", "Breakthrough / television mood supports broadcast motifs.", [
        "visual.lightingStyle",
        "experience.overallMood",
      ]),
    );
  }
  if (includesAny(lighting, ["stage", "concert", "warm"])) {
    motifs.push(
      choice("concert_light", "Concert lighting", "Stage lighting dominates visual identity.", [
        "visual.lightingStyle",
      ]),
    );
    motifs.push(
      choice("stage_light", "Stage lighting", "Performance-driven story angle.", [
        "visual.lightingStyle",
        "story.performanceImportance",
      ]),
    );
  }
  if (includesAny(story?.performanceImportance ?? "", ["high", "central", "primary"])) {
    motifs.push(
      choice("ticket_stub", "Ticket stubs", "Performance importance suggests live-show ephemera.", [
        "story.performanceImportance",
      ]),
    );
  }
  if (includesAny(story?.culturalImportance ?? "", ["high", "landmark", "iconic"])) {
    motifs.push(
      choice("record_label", "Record labels", "Cultural landmark status suits label-circle motifs.", [
        "story.culturalImportance",
      ]),
    );
  }
  if (includesAny(visual?.visualTexture ?? "", ["grain", "paper", "print"])) {
    motifs.push(
      choice("magazine_layout", "Magazine layouts", "Print texture in visual DNA.", ["visual.visualTexture"]),
    );
  }
  if (layoutId === "collector") {
    motifs.push(
      choice("album_sleeve", "Album sleeves", "Collector layout echoes sleeve artwork.", [
        "experience.preferredLayoutStyle",
      ]),
    );
  }
  if (includesAny(story?.historicalImportance ?? "", ["high", "significant"])) {
    motifs.push(
      choice("timeline_ephemera", "Timeline ephemera", "Historical weight supports dated ephemera.", [
        "story.historicalImportance",
      ]),
    );
  }

  if (motifs.length === 0) {
    motifs.push(
      choice("poster_comp", "Poster composition", "Default Retroverse poster-like collectible framing.", [
        "experience.preferredLayoutStyle",
      ]),
    );
  }

  return motifs.slice(0, 5);
}

function profileToThemeVars(
  profile: Pick<ArtDirectionProfile, "colorSystem" | "typography" | "layoutId">,
  dna: CollectorSongDna | null,
): Record<string, string> {
  const { swatches } = profile.colorSystem;
  const bg = swatches.background;
  const bgAlt = swatches.surface;
  const accent = swatches.accent;
  const text =
    luminance(bg) > 0.55 ? mix(bg, "#000000", 0.88) : mix(bg, "#FFFFFF", 0.92);
  const textMuted = luminance(bg) > 0.55 ? mix(text, bg, 0.45) : mix(text, bg, 0.65);

  const experience = dna?.experience;
  const energy =
    includesAny(experience?.visualEnergy ?? "", ["high", "kinetic"])
      ? "1.05"
      : includesAny(experience?.visualEnergy ?? "", ["still", "low"])
        ? "0.94"
        : "1";

  const spaceScale = includesAny(experience?.readingPace ?? "", ["brisk"])
    ? "0.92"
    : includesAny(experience?.readingPace ?? "", ["leisurely"])
      ? "1.18"
      : "1";

  return {
    "--elab-bg": bg,
    "--elab-bg-alt": bgAlt,
    "--elab-text": text,
    "--elab-text-muted": textMuted,
    "--elab-accent": accent,
    "--elab-primary": swatches.palettePrimary,
    "--elab-secondary": swatches.paletteSecondary,
    "--elab-border": mix(text, bg, 0.22),
    "--elab-font": profile.typography.fontStack,
    "--elab-space-scale": spaceScale,
    "--elab-energy": energy,
  };
}

export function buildArtDirectionProfile(input: BuildInput): ArtDirectionProfile {
  const { songDna, experience, layoutId, rvtr } = input;
  const signals = experience ? extractRenderSpecSignals(experience) : EMPTY_SIGNALS;
  const colorSystem = buildColorSystem(songDna, layoutId, rvtr);
  const typography = typographyFromDna(songDna);
  const composition = buildComposition(songDna, layoutId, signals);
  const motion = buildMotion(songDna, layoutId, signals);
  const visualMotifs = buildVisualMotifs(songDna, layoutId);

  const profile: ArtDirectionProfile = {
    rvtr,
    layoutId,
    generatedAt: new Date().toISOString(),
    colorSystem,
    typography,
    composition,
    motion,
    visualMotifs,
    dnaSummary: {
      overallMood: songDna?.experience.overallMood ?? "—",
      visualEnergy: songDna?.experience.visualEnergy ?? "—",
      readingPace: songDna?.experience.readingPace ?? "—",
      primaryTheme: songDna?.story.primaryTheme ?? "—",
      lightingStyle: songDna?.visual?.lightingStyle ?? null,
      recommendedColorFamily: songDna?.experience.recommendedColorFamily ?? "—",
      recommendedMotionStyle: songDna?.experience.recommendedMotionStyle ?? "—",
    },
    themeVars: {},
  };

  profile.themeVars = profileToThemeVars(profile, songDna);
  return profile;
}

export function artDirectionFingerprint(profile: ArtDirectionProfile): string {
  return [
    profile.colorSystem.background.label,
    profile.colorSystem.accent.label,
    profile.typography.characteristic.label,
    profile.composition.whiteSpace.label,
    profile.composition.framingStyle.label,
    profile.motion.profile.label,
    profile.visualMotifs.map((m) => m.label).join(","),
    profile.layoutId,
  ].join("|");
}
