'use client';

/**
 * ArticleChart — Inline SVG chart components for blog articles.
 * SEO-optimized: uses <text> elements (crawlable), <title>/<desc> for accessibility.
 * Inspired by mygreatpumpkin.com waterfall chart pattern.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HorizontalBarData {
  label: string;
  value: number;
  color?: string;
  detail?: string;
}

export interface HorizontalBarChartProps {
  type: 'horizontal-bar';
  title: string;
  subtitle?: string;
  description: string;
  data: HorizontalBarData[];
  valueLabel?: string; // e.g. "%" or "K"
  annotation?: string;
}

export interface WaterfallData {
  label: string;
  value: number;
  color?: string;
  type?: string;
}

export interface WaterfallChartProps {
  type: 'waterfall';
  title: string;
  subtitle?: string;
  description: string;
  data: WaterfallData[];
  totalLabel?: string;
  totalValue?: number;
  valueLabel?: string;
  annotation?: string;
}

export interface ProcessStep {
  label: string;
  detail?: string;
}

export interface ProcessFlowProps {
  type: 'process-flow';
  title: string;
  subtitle?: string;
  description: string;
  steps: ProcessStep[];
  annotation?: string;
}

export type ChartSpec =
  | HorizontalBarChartProps
  | WaterfallChartProps
  | ProcessFlowProps;

// ─── Color Palette ───────────────────────────────────────────────────────────

const COLORS = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
];

const BG_COLOR = '#f8fafc'; // slate-50
const TEXT_PRIMARY = '#1e293b'; // slate-800
const TEXT_SECONDARY = '#64748b'; // slate-500
const TEXT_MUTED = '#94a3b8'; // slate-400
const GRID_COLOR = '#e2e8f0'; // slate-200
const ANNOTATION_BORDER = '#3b82f6';

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

export function ArticleChart({ spec }: { spec: ChartSpec }) {
  switch (spec.type) {
    case 'horizontal-bar':
      return <HorizontalBarChart {...spec} />;
    case 'waterfall':
      return <WaterfallChart {...spec} />;
    case 'process-flow':
      return <ProcessFlowChart {...spec} />;
    default:
      return null;
  }
}

// ─── Horizontal Bar Chart ────────────────────────────────────────────────────

function HorizontalBarChart({
  title,
  subtitle,
  description,
  data,
  valueLabel = '%',
  annotation,
}: HorizontalBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value));
  const barHeight = 36;
  const barGap = 16;
  const topPadding = subtitle ? 72 : 56;
  const chartStart = topPadding + 8;
  const chartWidth = 520;
  const labelWidth = 200;
  const leftOffset = labelWidth + 20;
  const totalHeight =
    chartStart + data.length * (barHeight + barGap) + (annotation ? 72 : 24);
  const svgWidth = leftOffset + chartWidth + 80;

  return (
    <div className="my-10 rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <svg
        viewBox={`0 0 ${svgWidth} ${totalHeight}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="chart-title chart-desc"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <title id="chart-title">{title}</title>
        <desc id="chart-desc">{description}</desc>

        {/* Background */}
        <rect width={svgWidth} height={totalHeight} fill={BG_COLOR} />

        {/* Title */}
        <text
          x={svgWidth / 2}
          y={28}
          textAnchor="middle"
          fontSize="15"
          fontWeight="bold"
          fill={TEXT_PRIMARY}
        >
          {title}
        </text>
        {subtitle && (
          <text
            x={svgWidth / 2}
            y={48}
            textAnchor="middle"
            fontSize="11"
            fill={TEXT_SECONDARY}
          >
            {subtitle}
          </text>
        )}

        {/* Bars */}
        {data.map((d, i) => {
          const y = chartStart + i * (barHeight + barGap);
          const barWidth = maxVal > 0 ? (d.value / maxVal) * chartWidth : 0;
          const color = d.color || COLORS[i % COLORS.length];

          return (
            <g key={i}>
              {/* Label */}
              <text
                x={labelWidth}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize="12"
                fill={TEXT_PRIMARY}
              >
                {d.label}
              </text>

              {/* Bar background */}
              <rect
                x={leftOffset}
                y={y}
                width={chartWidth}
                height={barHeight}
                fill="#f1f5f9"
                rx="4"
              />

              {/* Bar fill */}
              <rect
                x={leftOffset}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx="4"
                opacity="0.85"
              />

              {/* Value */}
              <text
                x={leftOffset + barWidth + 8}
                y={y + barHeight / 2 + 4}
                fontSize="12"
                fontWeight="bold"
                fill={color}
              >
                {d.value}
                {valueLabel}
              </text>
            </g>
          );
        })}

        {/* Annotation */}
        {annotation && (
          <g>
            <rect
              x={40}
              y={totalHeight - 56}
              width={svgWidth - 80}
              height={40}
              fill="#fff"
              stroke={ANNOTATION_BORDER}
              strokeWidth="1.5"
              rx="6"
            />
            <text
              x={svgWidth / 2}
              y={totalHeight - 32}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={ANNOTATION_BORDER}
            >
              {annotation}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Waterfall Chart ─────────────────────────────────────────────────────────

function WaterfallChart({
  title,
  subtitle,
  description,
  data,
  totalLabel = 'Total',
  totalValue,
  annotation,
}: WaterfallChartProps) {
  const computedTotal = totalValue ?? data.reduce((sum, d) => sum + d.value, 0);
  const maxVal = Math.max(computedTotal, ...data.map((d) => d.value));

  const barCount = data.length + 1; // +1 for total
  const barWidth = 70;
  const barGap = 30;
  const leftPad = 80;
  const topPad = subtitle ? 72 : 56;
  const chartHeight = 280;
  const chartBottom = topPad + chartHeight;
  const svgWidth = leftPad + barCount * (barWidth + barGap) + 40;
  const totalH = chartBottom + 56 + (annotation ? 60 : 0);

  // Scale: value → pixel height
  const scale = (v: number) => (v / (maxVal * 1.15)) * chartHeight;

  // Build cumulative positions
  let cumulative = 0;
  const bars = data.map((d, i) => {
    const height = scale(d.value);
    const y = chartBottom - scale(cumulative + d.value);
    cumulative += d.value;
    return { ...d, height, y, color: d.color || COLORS[i % COLORS.length] };
  });

  const totalBar = {
    label: totalLabel,
    height: scale(computedTotal),
    y: chartBottom - scale(computedTotal),
    color: TEXT_PRIMARY,
  };

  return (
    <div className="my-10 rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <svg
        viewBox={`0 0 ${svgWidth} ${totalH}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="wf-title wf-desc"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <title id="wf-title">{title}</title>
        <desc id="wf-desc">{description}</desc>

        <rect width={svgWidth} height={totalH} fill={BG_COLOR} />

        {/* Title */}
        <text
          x={svgWidth / 2}
          y={28}
          textAnchor="middle"
          fontSize="15"
          fontWeight="bold"
          fill={TEXT_PRIMARY}
        >
          {title}
        </text>
        {subtitle && (
          <text
            x={svgWidth / 2}
            y={48}
            textAnchor="middle"
            fontSize="11"
            fill={TEXT_SECONDARY}
          >
            {subtitle}
          </text>
        )}

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = chartBottom - frac * chartHeight;
          const val = Math.round(frac * maxVal * 1.15);
          return (
            <g key={frac}>
              <line
                x1={leftPad - 10}
                y1={y}
                x2={svgWidth - 20}
                y2={y}
                stroke={frac === 0 ? '#94a3b8' : GRID_COLOR}
                strokeWidth={frac === 0 ? 1.5 : 1}
              />
              <text
                x={leftPad - 14}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fill={TEXT_MUTED}
              >
                {val >= 1000 ? `$${Math.round(val / 1000)}K` : `$${val}`}
              </text>
            </g>
          );
        })}

        {/* Data bars */}
        {bars.map((bar, i) => {
          const x = leftPad + i * (barWidth + barGap);
          return (
            <g key={i}>
              <rect
                x={x}
                y={bar.y}
                width={barWidth}
                height={bar.height}
                fill={bar.color}
                rx="3"
              />
              <text
                x={x + barWidth / 2}
                y={bar.y - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill={bar.color}
              >
                ${bar.value >= 1000 ? `${Math.round(bar.value / 1000)}K` : bar.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartBottom + 16}
                textAnchor="middle"
                fontSize="9"
                fill={TEXT_SECONDARY}
              >
                {bar.label}
              </text>

              {/* Connector line */}
              {i < bars.length - 1 && (
                <line
                  x1={x + barWidth}
                  y1={bar.y}
                  x2={x + barWidth + barGap}
                  y2={bar.y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4,3"
                />
              )}
            </g>
          );
        })}

        {/* Total bar */}
        <g>
          <rect
            x={leftPad + bars.length * (barWidth + barGap)}
            y={totalBar.y}
            width={barWidth}
            height={totalBar.height}
            fill={totalBar.color}
            rx="3"
          />
          <text
            x={leftPad + bars.length * (barWidth + barGap) + barWidth / 2}
            y={totalBar.y + totalBar.height / 2 + 4}
            textAnchor="middle"
            fontSize="13"
            fontWeight="bold"
            fill="#fff"
          >
            ${computedTotal >= 1000 ? `${Math.round(computedTotal / 1000)}K` : computedTotal}
          </text>
          <text
            x={leftPad + bars.length * (barWidth + barGap) + barWidth / 2}
            y={chartBottom + 16}
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill={TEXT_PRIMARY}
          >
            {totalLabel.toUpperCase()}
          </text>

          {/* Connector from last data bar to total */}
          {bars.length > 0 && (
            <line
              x1={leftPad + (bars.length - 1) * (barWidth + barGap) + barWidth}
              y1={bars[bars.length - 1].y}
              x2={leftPad + bars.length * (barWidth + barGap)}
              y2={bars[bars.length - 1].y}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4,3"
            />
          )}
        </g>

        {/* Annotation */}
        {annotation && (
          <g>
            <rect
              x={40}
              y={totalH - 48}
              width={svgWidth - 80}
              height={36}
              fill="#fff"
              stroke={ANNOTATION_BORDER}
              strokeWidth="1.5"
              rx="6"
            />
            <text
              x={svgWidth / 2}
              y={totalH - 26}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={ANNOTATION_BORDER}
            >
              {annotation}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Process Flow Chart ──────────────────────────────────────────────────────

/** Wrap text into lines that fit within maxChars */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function ProcessFlowChart({
  title,
  subtitle,
  description,
  steps,
  annotation,
}: ProcessFlowProps) {
  const stepWidth = 130;
  const stepHeight = 52;
  const arrowWidth = 36;
  const topPad = subtitle ? 72 : 56;
  const svgWidth = steps.length * (stepWidth + arrowWidth) - arrowWidth + 80;
  const hasDetails = steps.some((s) => s.detail);
  const detailAreaHeight = hasDetails ? 36 : 0;
  const totalH = topPad + stepHeight + 24 + detailAreaHeight + 24 + (annotation ? 60 : 0);
  const stepY = topPad + 8;

  return (
    <div className="my-10 rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <svg
        viewBox={`0 0 ${svgWidth} ${totalH}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="pf-title pf-desc"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <title id="pf-title">{title}</title>
        <desc id="pf-desc">{description}</desc>

        <rect width={svgWidth} height={totalH} fill={BG_COLOR} />

        {/* Title */}
        <text
          x={svgWidth / 2}
          y={28}
          textAnchor="middle"
          fontSize="15"
          fontWeight="bold"
          fill={TEXT_PRIMARY}
        >
          {title}
        </text>
        {subtitle && (
          <text
            x={svgWidth / 2}
            y={48}
            textAnchor="middle"
            fontSize="11"
            fill={TEXT_SECONDARY}
          >
            {subtitle}
          </text>
        )}

        {/* Steps */}
        {steps.map((step, i) => {
          const x = 40 + i * (stepWidth + arrowWidth);
          const color = COLORS[i % COLORS.length];
          const boxTop = stepY + 10;
          const boxMidY = boxTop + stepHeight / 2;

          return (
            <g key={i}>
              {/* Step number badge */}
              <circle cx={x + 16} cy={stepY - 2} r="10" fill={color} />
              <text
                x={x + 16}
                y={stepY + 2}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="#fff"
              >
                {i + 1}
              </text>

              {/* Step box */}
              <rect
                x={x}
                y={boxTop}
                width={stepWidth}
                height={stepHeight}
                fill="#fff"
                stroke={color}
                strokeWidth="1.5"
                rx="8"
              />

              {/* Step label — centered in box */}
              <text
                x={x + stepWidth / 2}
                y={boxMidY + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={TEXT_PRIMARY}
              >
                {step.label}
              </text>

              {/* Step detail — below box, wrapped */}
              {step.detail &&
                wrapText(step.detail, 22).map((line, li) => (
                  <text
                    key={li}
                    x={x + stepWidth / 2}
                    y={boxTop + stepHeight + 14 + li * 12}
                    textAnchor="middle"
                    fontSize="8"
                    fill={TEXT_MUTED}
                  >
                    {line}
                  </text>
                ))}

              {/* Arrow to next step */}
              {i < steps.length - 1 && (
                <g>
                  <line
                    x1={x + stepWidth + 4}
                    y1={boxMidY}
                    x2={x + stepWidth + arrowWidth - 8}
                    y2={boxMidY}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                  <polygon
                    points={`${x + stepWidth + arrowWidth - 8},${boxMidY - 4} ${x + stepWidth + arrowWidth - 2},${boxMidY} ${x + stepWidth + arrowWidth - 8},${boxMidY + 4}`}
                    fill="#94a3b8"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Annotation */}
        {annotation && (
          <g>
            <rect
              x={40}
              y={totalH - 48}
              width={svgWidth - 80}
              height={36}
              fill="#fff"
              stroke={ANNOTATION_BORDER}
              strokeWidth="1.5"
              rx="6"
            />
            <text
              x={svgWidth / 2}
              y={totalH - 26}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={ANNOTATION_BORDER}
            >
              {annotation}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
