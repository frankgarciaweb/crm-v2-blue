import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PANEL_WIDTH_CM = 43;
const PANEL_HEIGHT_CM = 180;
const HORIZONTAL_COUNT = 5;
const HORIZONTAL_LENGTH_CM = 39;
const PIECE_THICKNESS_MM = 20;
const DEFECT_RATE = 0.4;
const GOOD_PROBABILITY = 1 - DEFECT_RATE;
const TARGET_CONFIDENCE = 0.95;

type CalcResult = {
  panelsWanted: number;
  boardWidthCm: number;
  panelsPerBoard: number;
  boardsMin: number;
  boardsConMargen: number;
  probability: number;
  totalPanels: number;
  panelsExtra: number;
  columnsPerStrip: number;
  totalColumns: number;
  verticalesPerStrip: number;
  horizontalesPerStrip: number;
  horizontalesPerColumn: number;
  totalHorizontalesPerBoard: number;
  verticalesPerBoard: number;
  horizontalesNecesarias: number;
  verticalesNecesarias: number;
  error: string | null;
};

function binomialProbabilityAtLeast(totalBoards: number, minGoodBoards: number, goodProbability: number) {
  if (minGoodBoards <= 0) return 1;
  if (totalBoards < minGoodBoards) return 0;

  const badProbability = 1 - goodProbability;
  let probability = 0;

  for (let goodBoards = minGoodBoards; goodBoards <= totalBoards; goodBoards += 1) {
    let combinations = 1;
    for (let i = 1; i <= goodBoards; i += 1) {
      combinations = (combinations * (totalBoards - i + 1)) / i;
    }
    probability += combinations * (goodProbability ** goodBoards) * (badProbability ** (totalBoards - goodBoards));
  }

  return probability;
}

function chooseBoardsWithConfidence(minBoards: number, goodProbability: number, targetConfidence: number) {
  let boards = Math.max(minBoards, 1);
  let probability = binomialProbabilityAtLeast(boards, minBoards, goodProbability);

  while (probability < targetConfidence && boards < 100) {
    boards += 1;
    probability = binomialProbabilityAtLeast(boards, minBoards, goodProbability);
  }

  return { boards, probability };
}

function calcular(panelsWanted: number, boardWidthCm: number): CalcResult | null {
  if (panelsWanted <= 0 || boardWidthCm < 4) {
    return null;
  }

  const strips = 2;
  const boardWidthMm = boardWidthCm * 10;
  const columnsPerStrip = Math.floor(boardWidthMm / PIECE_THICKNESS_MM);
  const totalColumns = columnsPerStrip * strips;
  const columnsPerPanel = 4;
  const panelsPerBoard = Math.floor(totalColumns / columnsPerPanel);

  if (panelsPerBoard === 0) {
    return {
      panelsWanted,
      boardWidthCm,
      panelsPerBoard: 0,
      boardsMin: 0,
      boardsConMargen: 0,
      probability: 0,
      totalPanels: 0,
      panelsExtra: 0,
      columnsPerStrip,
      totalColumns,
      verticalesPerStrip: 0,
      horizontalesPerStrip: 0,
      horizontalesPerColumn: Math.floor(PANEL_HEIGHT_CM / HORIZONTAL_LENGTH_CM),
      totalHorizontalesPerBoard: 0,
      verticalesPerBoard: 0,
      horizontalesNecesarias: panelsWanted * HORIZONTAL_COUNT,
      verticalesNecesarias: panelsWanted * 2,
      error: `Ancho de ${boardWidthCm}cm es muy chico. Mínimo 4cm para que quepan piezas.`,
    };
  }

  const boardsMin = Math.ceil(panelsWanted / panelsPerBoard);
  const { boards: boardsConMargen, probability } = chooseBoardsWithConfidence(
    boardsMin,
    GOOD_PROBABILITY,
    TARGET_CONFIDENCE
  );

  const totalPanels = boardsConMargen * panelsPerBoard;
  const panelsExtra = totalPanels - panelsWanted;
  const verticalesPerStrip = Math.min(2, columnsPerStrip);
  const horizontalesPerStrip = Math.max(0, columnsPerStrip - verticalesPerStrip);
  const horizontalesPerColumn = Math.floor(PANEL_HEIGHT_CM / HORIZONTAL_LENGTH_CM);
  const totalHorizontalesPerBoard = horizontalesPerStrip * strips * horizontalesPerColumn;
  const horizontalesNecesarias = panelsWanted * HORIZONTAL_COUNT;
  const verticalesNecesarias = panelsWanted * 2;
  const verticalesPerBoard = verticalesPerStrip * strips;

  return {
    panelsWanted,
    boardWidthCm,
    panelsPerBoard,
    boardsMin,
    boardsConMargen,
    probability,
    totalPanels,
    panelsExtra,
    columnsPerStrip,
    totalColumns,
    verticalesPerStrip,
    horizontalesPerStrip,
    horizontalesPerColumn,
    totalHorizontalesPerBoard,
    verticalesPerBoard,
    horizontalesNecesarias,
    verticalesNecesarias,
    error: null,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function StatValue({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: '#1E293B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.25rem',
        padding: '1rem',
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#94A3B8',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: '0.75rem',
          fontFamily: 'Geist, Inter, sans-serif',
          fontSize: '24px',
          fontWeight: 700,
          color: '#b4c5ff',
          lineHeight: '32px',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#F8FAFC', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{value}</span>
    </div>
  );
}

export default function CalcularMadera() {
  const [panels, setPanels] = useState('4');
  const [boardWidth, setBoardWidth] = useState('40');

  const result = calcular(Number(panels), Number(boardWidth));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Calculadora de madera"
        description="Estimación interna para tableros de paraban"
        icon="straighten"
        actions={
          <Button asChild variant="outline" size="sm">
            <NavLink to="/">Volver al dashboard</NavLink>
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-4">
          <div
            style={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.25rem',
              padding: '1.25rem',
            }}
          >
            <h2 style={{ margin: 0, fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', color: '#F8FAFC' }}>
              Datos de entrada
            </h2>
            <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              Cada panel mide {PANEL_WIDTH_CM}×{PANEL_HEIGHT_CM}cm y usa {HORIZONTAL_COUNT} horizontales de {HORIZONTAL_LENGTH_CM}cm.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8' }}>
                  Número de paneles
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={panels}
                  onChange={e => setPanels(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94A3B8' }}>
                  Ancho de la tabla (cm)
                </label>
                <Input
                  type="number"
                  min="4"
                  max="100"
                  value={boardWidth}
                  onChange={e => setBoardWidth(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid rgba(180,197,255,0.18)',
              borderRadius: '0.25rem',
              padding: '1rem 1.25rem',
              color: '#c3c6d7',
              fontSize: '13px',
              lineHeight: 1.6,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <strong style={{ color: '#b4c5ff' }}>Margen usado:</strong> se busca llegar al menos a {formatPercent(TARGET_CONFIDENCE)} de probabilidad de tener suficientes tablas útiles.
          </div>
        </div>

        <div className="xl:col-span-8 space-y-6">
          {result && !result.error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatValue label="Tablas a comprar" value={String(result.boardsConMargen)} />
                <StatValue label="Mínimo sin margen" value={String(result.boardsMin)} />
                <StatValue label="Paneles por tabla" value={String(result.panelsPerBoard)} />
                <StatValue label="Probabilidad" value={formatPercent(result.probability)} />
              </div>

              <div
                style={{
                  backgroundColor: '#1E293B',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.25rem',
                  padding: '1.25rem',
                }}
              >
                <h2 style={{ margin: 0, fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', color: '#F8FAFC' }}>
                  Desglose
                </h2>
                <div style={{ marginTop: '1rem' }}>
                  <DetailRow label="Tablas mínimo" value={`${result.boardsMin} tabla${result.boardsMin === 1 ? '' : 's'}`} />
                  <DetailRow label="Margen añadido" value={`${result.boardsConMargen - result.boardsMin} tabla${result.boardsConMargen - result.boardsMin === 1 ? '' : 's'}`} />
                  <DetailRow label="Paneles totales" value={String(result.totalPanels)} />
                  <DetailRow label="Paneles de sobra" value={String(result.panelsExtra)} />
                  <DetailRow label="Columnas por tira" value={`${result.columnsPerStrip} de ${PIECE_THICKNESS_MM}mm`} />
                  <DetailRow label="Verticales por tira" value={`${result.verticalesPerStrip} pieza${result.verticalesPerStrip === 1 ? '' : 's'}`} />
                  <DetailRow label="Horizontales por tira" value={`${result.horizontalesPerStrip} columna${result.horizontalesPerStrip === 1 ? '' : 's'}`} />
                  <DetailRow label="Horizontales necesarias" value={String(result.horizontalesNecesarias)} />
                  <DetailRow label="Verticales necesarias" value={String(result.verticalesNecesarias)} />
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#10233a',
                  border: '1px solid rgba(77,218,163,0.22)',
                  borderRadius: '0.25rem',
                  padding: '1rem 1.25rem',
                  color: '#d8f9ea',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Si compras {result.boardsConMargen} tablas, la probabilidad estimada de cubrir {result.boardsMin} tablas útiles o más es {formatPercent(result.probability)}.
              </div>
            </>
          )}

          {result && result.error && (
            <div
              style={{
                backgroundColor: '#2A0000',
                border: '1px solid #4A0000',
                borderRadius: '0.25rem',
                padding: '1rem 1.25rem',
                color: '#FFB4B4',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {result.error}
            </div>
          )}

          <div
            style={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.25rem',
              padding: '1.25rem',
            }}
          >
            <h2 style={{ margin: 0, fontFamily: 'Geist, Inter, sans-serif', fontSize: '18px', color: '#F8FAFC' }}>
              Vista de corte
            </h2>
            <p style={{ margin: '0.5rem 0 1rem', fontSize: '13px', color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              Tira de {PANEL_HEIGHT_CM}cm × {Number(boardWidth) || 0}cm.
            </p>
            <div className="overflow-x-auto">
              <div
                style={{
                  position: 'relative',
                  height: '56px',
                  minWidth: '460px',
                  borderRadius: '0.25rem',
                  overflow: 'hidden',
                  background: '#3a2a1a',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {result && !result.error && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${Math.max(0, result.verticalesPerStrip) * 18}%`,
                        background: '#2563eb',
                        color: '#eeefff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      V × {result.verticalesPerStrip}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: `${Math.max(0, result.verticalesPerStrip) * 18}%`,
                        height: '100%',
                        width: `${Math.max(0, result.horizontalesPerStrip) * 18}%`,
                        background: '#4ade80',
                        color: '#052e16',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      H × {result.horizontalesPerColumn}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
