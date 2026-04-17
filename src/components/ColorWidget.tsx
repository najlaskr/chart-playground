import { ChartPalette, LayerCard, Table } from "@cloudflare/kumo";
import { useState } from "react";

// ─── Sequential scale derivation ─────────────────────────────────────────────
// Takes the base colour (category[0]) and produces 5 steps:
//   step 1  — lightest  (base hue, very light, low saturation)
//   step 2  — light
//   step 3  — base colour itself (anchor)
//   step 4  — dark
//   step 5  — darkest
//
// Conversion path: hex → HSL → interpolate L (and slightly S) → hex

function hexToHsl(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    const tNorm = ((t % 1) + 1) % 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHexChannel = (v: number) =>
    Math.round(v * 255).toString(16).padStart(2, "0");

  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`.toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "").trim();
  return [
    Number.parseInt(c.slice(0, 2), 16),
    Number.parseInt(c.slice(2, 4), 16),
    Number.parseInt(c.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHexChannel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");

  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`.toUpperCase();
}

function mixHex(fromHex: string, toHex: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  const t = Math.max(0, Math.min(1, ratio));

  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

// Produce 5 sequential steps from a base colour.
// Steps are evenly distributed between a very light and a very dark anchor,
// with the base colour locked at step index 2 (0-indexed, i.e. the middle).
function buildSequentialScale(baseHex: string, isDarkMode: boolean): string[] {
  const [h, s, l] = hexToHsl(baseHex);

  // Light mode: lightest at top, darkest at bottom (high L → low L)
  // Dark mode: flip — darkest at top, lightest at bottom (low L → high L)
  // Step distribution: [90, 75, base_l, 35, 18] for light mode
  // The base L is locked; we interpolate symmetrically around it.

  const lightAnchor = 88;   // step 1 in light mode
  const darkAnchor  = 16;   // step 5 in light mode

  // Saturation reduces at the light end to avoid washed-out pastels
  const lightSat = Math.min(s, 45);
  const darkSat  = Math.min(s * 1.1, 100);

  if (isDarkMode) {
    // Dark mode: reverse direction — step 1 is darkest, step 5 is lightest
    return [
      hslToHex(h, darkSat,  darkAnchor),
      hslToHex(h, s,        Math.round((darkAnchor + l) / 2)),
      baseHex.toUpperCase(),
      hslToHex(h, lightSat, Math.round((l + lightAnchor) / 2)),
      hslToHex(h, lightSat, lightAnchor),
    ];
  }

  // Light mode: step 1 = lightest, step 5 = darkest
  return [
    hslToHex(h, lightSat, lightAnchor),
    hslToHex(h, s,        Math.round((lightAnchor + l) / 2)),
    baseHex.toUpperCase(),
    hslToHex(h, s,        Math.round((l + darkAnchor) / 2)),
    hslToHex(h, darkSat,  darkAnchor),
  ];
}

function buildDivergingScale(
  lowHex: string,
  highHex: string,
  neutralHex: string,
  isDarkMode: boolean,
): string[] {
  const lowRatio = isDarkMode ? 0.65 : 0.35;
  const highRatio = isDarkMode ? 0.35 : 0.65;

  return [
    lowHex.toUpperCase(),
    mixHex(lowHex, neutralHex, lowRatio),
    neutralHex.toUpperCase(),
    mixHex(neutralHex, highHex, highRatio),
    highHex.toUpperCase(),
  ];
}

const sequentialStepLabels = [
  "Step 1 — lightest",
  "Step 2",
  "Step 3 — base (category 0)",
  "Step 4",
  "Step 5 — darkest",
];

const divergingStepLabels = [
  "Low extreme",
  "Low",
  "Neutral midpoint",
  "High",
  "High extreme",
];

// Neutral:     oklch(62.7% 0.194 149.214) → #00A63E
// Info (blue):  #8EC5FF — reserved semantic info token, not for categorical use
const semanticRows = [
  { label: "Attention",     light: null,       dark: null,       meaning: "Danger / error / blocked" },
  { label: "Warning",       light: null,       dark: null,       meaning: "Degraded / challenged / needs improvement" },
  { label: "Neutral",       light: "#00A63E",  dark: "#00A63E",  meaning: "Success / allowed / normal baseline" },
  { label: "Info",          light: "#8EC5FF",  dark: "#8EC5FF",  meaning: "Informational / secondary / low-emphasis" },
  { label: "Disabled",      light: null,       dark: null,       meaning: "Inactive / no data" },
  { label: "Disabled Light",light: null,       dark: null,       meaning: "Skeleton / placeholder" },
] as const;

const categoricalRows = [
  { token: "Blue", index: 0 },
  { token: "Violet", index: 1 },
  { token: "Cyan", index: 2 },
  { token: "Indigo", index: 3 },
  { token: "LightBlue", index: 4 },
  { token: "Pink", index: 5 },
] as const;

function srgbToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

function parseColorToRgb(color: string) {
  const value = color.trim();

  if (value.startsWith("#")) {
    const cleaned = value.replace("#", "");

    if (cleaned.length === 3) {
      const r = Number.parseInt(cleaned[0] + cleaned[0], 16);
      const g = Number.parseInt(cleaned[1] + cleaned[1], 16);
      const b = Number.parseInt(cleaned[2] + cleaned[2], 16);
      return { r, g, b };
    }

    if (cleaned.length >= 6) {
      const r = Number.parseInt(cleaned.slice(0, 2), 16);
      const g = Number.parseInt(cleaned.slice(2, 4), 16);
      const b = Number.parseInt(cleaned.slice(4, 6), 16);
      return { r, g, b };
    }
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (!rgbMatch) return null;

  const [r, g, b] = rgbMatch[1]
    .split(",")
    .slice(0, 3)
    .map((channel) => Number.parseFloat(channel.trim()));

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { r, g, b };
}

function contrastRatio(foreground: string, background: string) {
  const fg = parseColorToRgb(foreground);
  const bg = parseColorToRgb(background);

  if (!fg || !bg) {
    return 1;
  }

  const fgLuminance =
    0.2126 * srgbToLinear(fg.r) +
    0.7152 * srgbToLinear(fg.g) +
    0.0722 * srgbToLinear(fg.b);

  const bgLuminance =
    0.2126 * srgbToLinear(bg.r) +
    0.7152 * srgbToLinear(bg.g) +
    0.0722 * srgbToLinear(bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

type ColorWidgetProps = {
  categoricalColors: string[];
  semanticColors: string[];
  onCategoricalColorChange: (rowIndex: number, nextColor: string) => void;
  onSemanticColorChange: (rowIndex: number, nextColor: string) => void;
  isDarkMode: boolean;
};

const LIGHT_BG = "#FFFFFF";
const DARK_BG  = "#101010";

export function ColorWidget({
  categoricalColors,
  semanticColors,
  onCategoricalColorChange,
  onSemanticColorChange,
  isDarkMode,
}: ColorWidgetProps) {
  const [divergingOverridesByMode, setDivergingOverridesByMode] = useState<{
    light: Partial<Record<"low" | "neutral" | "high", string>>;
    dark: Partial<Record<"low" | "neutral" | "high", string>>;
  }>({
    light: {},
    dark: {},
  });

  const contrastBackground = isDarkMode ? DARK_BG : LIGHT_BG;
  const modeKey = isDarkMode ? "dark" : "light";

  // Sequential scale derived from category[0] — the base anchor colour.
  // When the user edits category[0] the sequential scale updates in real time.
  const sequentialScale = buildSequentialScale(
    categoricalColors[0] ?? "#4290F0",
    isDarkMode,
  );

  const defaultDivergingLow = categoricalColors[0] ?? "#4290F0";
  const defaultDivergingNeutral = isDarkMode ? "#7A7A7A" : "#F3F4F6";
  const defaultDivergingHigh = categoricalColors[2] ?? "#E05267";
  const divergingLow = divergingOverridesByMode[modeKey].low ?? defaultDivergingLow;
  const divergingNeutral = divergingOverridesByMode[modeKey].neutral ?? defaultDivergingNeutral;
  const divergingHigh = divergingOverridesByMode[modeKey].high ?? defaultDivergingHigh;

  const handleDivergingAnchorChange = (
    anchor: "low" | "neutral" | "high",
    nextColor: string,
  ) => {
    setDivergingOverridesByMode((previous) => ({
      ...previous,
      [modeKey]: {
        ...previous[modeKey],
        [anchor]: nextColor,
      },
    }));
  };

  const divergingScale = buildDivergingScale(
    divergingLow,
    divergingHigh,
    divergingNeutral,
    isDarkMode,
  );

  return (
    <div className="h-full w-fit max-w-full space-y-6">
      <LayerCard className="w-fit max-w-full">
        <LayerCard.Secondary>
          <p className="m-0 text-sm">Semantic Tokens</p>
        </LayerCard.Secondary>
        <LayerCard.Primary className="!p-0 overflow-x-auto">
          <Table layout="auto">
            <Table.Body>
              {semanticRows.map(({ label, light, dark, meaning }, rowIndex) => {
                const explicit = isDarkMode ? dark : light;
                const baseColor = explicit
                  ? explicit
                  : String(ChartPalette.semantic(
                      label.replace(" ", "") as Parameters<typeof ChartPalette.semantic>[0],
                      isDarkMode,
                    ));
                const color = semanticColors[rowIndex] ?? baseColor;

                return (
                  <Table.Row key={label}>
                    <Table.Cell>
                      <p className="m-0 whitespace-nowrap pl-2 text-sm">{label}</p>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={`${label} color`}
                          value={color}
                          onChange={(event) => {
                            onSemanticColorChange(rowIndex, event.currentTarget.value);
                          }}
                          className="h-8 w-8 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                        />
                        <p className="m-0 w-[7ch] font-mono text-sm uppercase">{color.toUpperCase()}</p>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <p className="m-0 text-sm text-kumo-subtle">{meaning}</p>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard className="w-fit max-w-full">
        <LayerCard.Secondary>
          <p className="m-0 text-sm">Categorical Colors</p>
        </LayerCard.Secondary>
        <LayerCard.Primary className="!p-0 overflow-x-auto">
          <Table layout="auto">
            <Table.Body>
              {categoricalRows.map(({ token, index }, rowIndex) => {
                const color = categoricalColors[rowIndex] ?? String(ChartPalette.color(index));
                const contrast = contrastRatio(color, contrastBackground);
                const passes = contrast >= 3;
                const [, , lightness] = hexToHsl(color);

                return (
                  <Table.Row key={token}>
                    <Table.Cell>
                      <p className="m-0 whitespace-nowrap pl-2 text-sm">
                        {index}
                      </p>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={`${token} color`}
                          value={color}
                          onChange={(event) => {
                            onCategoricalColorChange(
                              rowIndex,
                              event.currentTarget.value,
                            );
                          }}
                          className="h-8 w-8 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                        />
                        <p className="m-0 w-[7ch] font-mono text-sm uppercase">{color}</p>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <p className="m-0 w-[4ch] text-sm tabular-nums text-kumo-subtle px-2">
                        {Math.round(lightness)}%
                      </p>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2 whitespace-nowrap px-2">
                        <p className={`m-0 w-[5ch] text-sm tabular-nums ${passes ? "" : "text-red-600"}`}>
                          {contrast.toFixed(1)}:1
                        </p>
                        <p className={`m-0 w-[1ch] text-center text-sm ${passes ? "" : "text-red-600"}`}>
                          {passes ? "✓" : "✗"}
                        </p>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <p className="m-0 text-sm">
                    Tested against {isDarkMode ? "#101010" : "#FFFFFF"}
                  </p>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard className="w-fit max-w-full">
        <LayerCard.Secondary>
          <p className="m-0 text-sm">Sequential Scale</p>
        </LayerCard.Secondary>
        <LayerCard.Primary className="!p-0 overflow-x-auto">
          <Table layout="auto">
            <Table.Body>
              {sequentialScale.map((color, i) => (
                <Table.Row key={i}>
                  <Table.Cell>
                    <div className="flex items-center justify-center pl-1">
                      <div
                        className="h-4 w-4 rounded-lg ring ring-kumo-line"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <p className="m-0 font-mono text-sm uppercase whitespace-nowrap">
                      {color}
                    </p>
                  </Table.Cell>
                  <Table.Cell>
                    <p className="m-0 text-xs text-kumo-subtle whitespace-nowrap pr-2">
                      {sequentialStepLabels[i]}
                    </p>
                  </Table.Cell>
                </Table.Row>
              ))}
              <Table.Row>
                <Table.Cell colSpan={3}>
                  <p className="m-0 text-sm text-kumo-subtle">
                    Derived from category 0 · tested against{" "}
                    {isDarkMode ? DARK_BG : LIGHT_BG}
                  </p>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard className="w-fit max-w-full">
        <LayerCard.Secondary>
          <p className="m-0 text-sm">Diverging Scale</p>
        </LayerCard.Secondary>
        <LayerCard.Primary className="!p-0 overflow-x-auto">
          <Table layout="auto">
            <Table.Body>
              <Table.Row>
                <Table.Cell>
                  <p className="m-0 whitespace-nowrap pl-2 text-sm">Low extreme</p>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Diverging low extreme color"
                      value={divergingLow}
                      onChange={(event) => {
                        handleDivergingAnchorChange("low", event.currentTarget.value);
                      }}
                      className="h-8 w-8 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <p className="m-0 w-[7ch] font-mono text-sm uppercase">{divergingLow.toUpperCase()}</p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <p className="m-0 text-xs text-kumo-subtle whitespace-nowrap pr-2">Anchor</p>
                </Table.Cell>
              </Table.Row>

              <Table.Row>
                <Table.Cell>
                  <p className="m-0 whitespace-nowrap pl-2 text-sm">Neutral midpoint</p>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Diverging neutral midpoint color"
                      value={divergingNeutral}
                      onChange={(event) => {
                        handleDivergingAnchorChange("neutral", event.currentTarget.value);
                      }}
                      className="h-8 w-8 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <p className="m-0 w-[7ch] font-mono text-sm uppercase">{divergingNeutral.toUpperCase()}</p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <p className="m-0 text-xs text-kumo-subtle whitespace-nowrap pr-2">Anchor</p>
                </Table.Cell>
              </Table.Row>

              <Table.Row>
                <Table.Cell>
                  <p className="m-0 whitespace-nowrap pl-2 text-sm">High extreme</p>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Diverging high extreme color"
                      value={divergingHigh}
                      onChange={(event) => {
                        handleDivergingAnchorChange("high", event.currentTarget.value);
                      }}
                      className="h-8 w-8 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <p className="m-0 w-[7ch] font-mono text-sm uppercase">{divergingHigh.toUpperCase()}</p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <p className="m-0 text-xs text-kumo-subtle whitespace-nowrap pr-2">Anchor</p>
                </Table.Cell>
              </Table.Row>

              {divergingScale.map((color, i) => (
                <Table.Row key={i}>
                  <Table.Cell>
                    <div className="flex items-center justify-center pl-1">
                      <div
                        className="h-4 w-4 rounded-lg ring ring-kumo-line"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <p className="m-0 font-mono text-sm uppercase whitespace-nowrap">
                      {color}
                    </p>
                  </Table.Cell>
                  <Table.Cell>
                    <p className="m-0 text-xs text-kumo-subtle whitespace-nowrap pr-2">
                      {divergingStepLabels[i]}
                    </p>
                  </Table.Cell>
                </Table.Row>
              ))}
              <Table.Row>
                <Table.Cell colSpan={3}>
                  <p className="m-0 text-sm text-kumo-subtle">
                    Derived from category 0 ↔ category 2 with neutral midpoint · tested against{" "}
                    {isDarkMode ? DARK_BG : LIGHT_BG}
                  </p>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </LayerCard.Primary>
      </LayerCard>
    </div>
  );
}