export type AcousticMetrics = {
  rvtr: string;
  artist: string;
  title: string;
  source: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  tempo: number;
  loudness: number;
  key: number | null;
  mode: number | null;
  timeSignature: number | null;
};

export type SynthVisualNotes = {
  palette: string[];
  strokeCount: number;
  avgBrushSize: number;
  curveAmplitude: number;
  contrast: number;
  blurRadius: number;
  detailStrokes: number;
  inkMarks: number;
  warmthBias: number;
};
