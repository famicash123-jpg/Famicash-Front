// ============================================================
// Vista de Reportes, Evolución Mensual en Barras Numeradas y
// Desglose por Área → Rubro → Concepto con nombres amigables
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceArea
} from 'recharts';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Pencil,
  Trash2,
  BarChart3,
  Layers,
  ListFilter,
  Home,
  UtensilsCrossed,
  Tag,
  Table2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import {
  formatSoles,
  formatSolesEntero,
  formatFechaCorta,
  getMetaCategoria,
  nombreCategoria,
  etiquetaCategoria,
  nombreSubcategoria,
  etiquetaSubcategoria,
  nombreMedioPago,
  periodoActual
} from '../utils/format';
import TablaDinamica from './TablaDinamica';
import { CategoriaIcon, SubcategoriaIcon, MedioPagoIcon } from './IconoFamicash';

function formatearNombreNivel(nivel, codigoONombre) {
  if (!codigoONombre) return '';
  if (nivel === 'categoria') return etiquetaCategoria(codigoONombre);
  if (nivel === 'subcategoria') return etiquetaSubcategoria(codigoONombre);
  return codigoONombre;
}

export default function VistaReportes({
  taxonomia = [],
  mediosPago = [],
  periodoTipo,
  periodoClave,
  filtros,
  setFiltros,
  drillInicial = null,
  onClearDrillInicial,
  onEditTransaccion,
  onDeleteTransaccion,
  onQuickAddTransaccion,
  refreshKey
}) {
  // Gráfico 1 (3 barras: Ingresos, Gastos, Disponible) y Gráfico 2 (Ahorro) abiertos;
  // Tabla Dinámica tercera y colapsada por defecto.
  const [mostrarEvolucion, setMostrarEvolucion] = useState(true);
  const [mostrarAhorroMes, setMostrarAhorroMes] = useState(true);
  const [mostrarTablaDinamica, setMostrarTablaDinamica] = useState(false);
  const [mostrarRankingHistorial, setMostrarRankingHistorial] = useState(Boolean(drillInicial));

  const [rangoEvolutivo, setRangoEvolutivo] = useState('6M');
  const [anioEvolutivo, setAnioEvolutivo] = useState(new Date().getFullYear());
  const [desdeMes, setDesdeMes] = useState(`${new Date().getFullYear()}-01`);
  const [hastaMes, setHastaMes] = useState(`${new Date().getFullYear()}-12`);

  // Sincronizar los gráficos de barras cuando cambia Mensual / Trimestral / Anual en BarraPeriodo
  useEffect(() => {
    if (!periodoClave) return;
    if (periodoTipo === 'ANUAL') {
      const y = parseInt(periodoClave, 10) || new Date().getFullYear();
      setAnioEvolutivo(y);
      setRangoEvolutivo('ANIO');
    } else if (periodoTipo === 'TRIMESTRAL') {
      const m = /^(\d{4})-Q([1-4])$/i.exec(periodoClave);
      if (m) {
        const y = Number(m[1]);
        const q = Number(m[2]);
        const iniM = String((q - 1) * 3 + 1).padStart(2, '0');
        const finM = String(q * 3).padStart(2, '0');
        setDesdeMes(`${y}-${iniM}`);
        setHastaMes(`${y}-${finM}`);
        setRangoEvolutivo('PERSONALIZADO');
      }
    } else if (periodoTipo === 'MENSUAL') {
      const m = /^(\d{4})-(\d{2})$/.exec(periodoClave);
      if (m) {
        const y = Number(m[1]);
        const mesIdx = Number(m[2]) - 1;
        const dIni = new Date(Date.UTC(y, mesIdx - 5, 1));
        const dIniStr = `${dIni.getUTCFullYear()}-${String(dIni.getUTCMonth() + 1).padStart(2, '0')}`;
        setDesdeMes(dIniStr);
        setHastaMes(periodoClave);
        setRangoEvolutivo('PERSONALIZADO');
      }
    }
  }, [periodoTipo, periodoClave]);
  const [seriesActivas, setSeriesActivas] = useState({
    ingresos: true,
    gastos: true,
    disponible: true,
    ahorro: true
  });
  const [evolutivo, setEvolutivo] = useState({
    meses: [],
    totales: { ingresos: 0, gastos: 0, disponible: 0, ahorro: 0 }
  });

  const scrollChart1Ref = useRef(null);
  const scrollChart2Ref = useRef(null);
  const mesActualClave = periodoActual('MENSUAL');
  const etiquetaMesActual = evolutivo.meses?.find((m) => m.mes === mesActualClave)?.etiqueta || null;

  useEffect(() => {
    const centrarMesActual = (el) => {
      if (!el) return;
      const idx = (evolutivo.meses || []).findIndex((m) => m.mes === mesActualClave);
      if (idx >= 0 && evolutivo.meses.length > 0) {
        const ratio = (idx + 1) / evolutivo.meses.length;
        el.scrollLeft = Math.max(0, el.scrollWidth * ratio - el.clientWidth + 40);
      } else {
        el.scrollLeft = el.scrollWidth;
      }
    };
    const t = setTimeout(() => {
      centrarMesActual(scrollChart1Ref.current);
      centrarMesActual(scrollChart2Ref.current);
    }, 80);
    return () => clearTimeout(t);
  }, [evolutivo.meses, mesActualClave, mostrarEvolucion, mostrarAhorroMes]);

  const [nivelVista, setNivelVista] = useState('categoria');
  const [tipoMovimientoNivel, setTipoMovimientoNivel] = useState('GASTO');
  const [porNivel, setPorNivel] = useState({ total: 0, items: [] });

  const [drill, setDrill] = useState(null);
  const [drillTab, setDrillTab] = useState('subcategorias');
  const [drillSubitems, setDrillSubitems] = useState([]);
  const [drillTransacciones, setDrillTransacciones] = useState([]);
  const [verTodasTx, setVerTodasTx] = useState(false);

  const [txFiltradas, setTxFiltradas] = useState({ items: [], total: 0, totales: {} });

  useEffect(() => {
    if (drillInicial) {
      setMostrarRankingHistorial(true);
      setDrill({
        nivel: 'categoria',
        id: drillInicial.categoriaId,
        nombre: drillInicial.categoria,
        monto: drillInicial.monto,
        pct: drillInicial.pct
      });
      setDrillTab('subcategorias');
      onClearDrillInicial?.();
    }
  }, [drillInicial]);

  const cargarDatosReportes = useCallback(async () => {
    try {
      const baseQuery = {
        ...filtros,
        periodoTipo,
        periodo: periodoClave
      };

      const evoParams = {
        ...filtros,
        rango: rangoEvolutivo,
        ...(rangoEvolutivo === 'ANIO' ? { anio: anioEvolutivo } : {}),
        ...(rangoEvolutivo === 'PERSONALIZADO' ? { desdeMes, hastaMes } : {})
      };

      const [resEvo, resNivel] = await Promise.all([
        api.getEvolutivo(evoParams),
        api.getPorNivel({ ...baseQuery, nivel: nivelVista, tipo: tipoMovimientoNivel })
      ]);

      const mesesConDisp = (resEvo?.meses || []).map((m) => ({
        ...m,
        disponible:
          m.disponible !== undefined
            ? m.disponible
            : Math.round(((m.ingresos || 0) - (m.gastos || 0)) * 100) / 100
      }));
      const totEvo = resEvo?.totales || { ingresos: 0, gastos: 0, ahorro: 0 };
      setEvolutivo({
        ...resEvo,
        meses: mesesConDisp,
        totales: {
          ...totEvo,
          disponible:
            totEvo.disponible !== undefined
              ? totEvo.disponible
              : Math.round(((totEvo.ingresos || 0) - (totEvo.gastos || 0)) * 100) / 100
        }
      });
      setPorNivel(resNivel);

      const resTx = await api.getTransacciones({
        ...filtros,
        desde: resNivel?.periodo?.desde,
        hasta: resNivel?.periodo?.hasta,
        limite: 500
      });
      setTxFiltradas(resTx);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    }
  }, [periodoTipo, periodoClave, filtros, rangoEvolutivo, anioEvolutivo, desdeMes, hastaMes, nivelVista, tipoMovimientoNivel, refreshKey]);

  useEffect(() => {
    cargarDatosReportes();
  }, [cargarDatosReportes]);

  useEffect(() => {
    if (!drill) return;
    const cargarDrill = async () => {
      try {
        const filtroDrill =
          drill.nivel === 'categoria'
            ? { ...filtros, categoriaIds: [drill.id] }
            : { ...filtros, subcategoriaIds: [drill.id] };

        const subNivel = drill.nivel === 'categoria' ? 'subcategoria' : 'detalle';
        const [resSub, resTx] = await Promise.all([
          api.getPorNivel({
            ...filtroDrill,
            periodoTipo,
            periodo: periodoClave,
            nivel: subNivel,
            tipo: tipoMovimientoNivel
          }),
          api.getTransacciones({
            ...filtroDrill,
            desde: porNivel?.periodo?.desde,
            hasta: porNivel?.periodo?.hasta,
            limite: 250
          })
        ]);
        setDrillSubitems(resSub.items || []);
        setDrillTransacciones(resTx.items || []);
      } catch (err) {
        console.error('Error cargando drill-down:', err);
      }
    };
    cargarDrill();
  }, [drill, periodoTipo, periodoClave, filtros, tipoMovimientoNivel, porNivel?.periodo?.desde, porNivel?.periodo?.hasta, refreshKey]);

  const toggleSerie = (key) => {
    setSeriesActivas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="reports-view-container">
      {/* ============================================================
          1. EVOLUCIÓN MENSUAL EN BARRAS (GRÁFICO PRINCIPAL, ABIERTO)
          ============================================================ */}
      <div className="panel-card">
        <button
          type="button"
          className="report-accordion-toggle"
          onClick={() => setMostrarEvolucion(!mostrarEvolucion)}
        >
          <div className="section-title-with-icon">
            <BarChart3 size={20} className="icon-forest" />
            <div className="rat-texts">
              <h3>1. Disponible (Ingreso − Gasto) — 3 barras por mes</h3>
              <small>Compara ingresos, gastos y disponible mes a mes</small>
            </div>
          </div>
          <span className="rat-pill">
            <span>{mostrarEvolucion ? 'Ocultar' : 'Ver gráfico'}</span>
            {mostrarEvolucion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        <AnimatePresence initial={false}>
        {mostrarEvolucion && (
          <motion.div
            className="report-accordion-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
        <div className="evo-series-toggles">
          <button
            type="button"
            className={`serie-toggle-pill ingreso ${seriesActivas.ingresos ? 'on' : 'off'}`}
            onClick={() => toggleSerie('ingresos')}
          >
            <span className="dot" style={{ background: '#059669' }} />
            <span>Ingresos: <strong>{formatSoles(evolutivo.totales?.ingresos, 0)}</strong></span>
          </button>
          <button
            type="button"
            className={`serie-toggle-pill gasto ${seriesActivas.gastos ? 'on' : 'off'}`}
            onClick={() => toggleSerie('gastos')}
          >
            <span className="dot" style={{ background: '#e11d48' }} />
            <span>Gastos: <strong>{formatSoles(evolutivo.totales?.gastos, 0)}</strong></span>
          </button>
          <button
            type="button"
            className={`serie-toggle-pill disponible ${seriesActivas.disponible ? 'on' : 'off'}`}
            onClick={() => toggleSerie('disponible')}
          >
            <span className="dot" style={{ background: '#6366f1' }} />
            <span>Disponible: <strong>{formatSoles(evolutivo.totales?.disponible, 0)}</strong></span>
          </button>
        </div>

        <div className="bar-chart-scroll-x" ref={scrollChart1Ref}>
          <div
            className="bar-chart-inner"
            style={{ minWidth: `${Math.max((evolutivo.meses?.length || 6) * 155, 560)}px` }}
          >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={evolutivo.meses || []}
              margin={{ top: 28, right: 16, left: 0, bottom: 8 }}
              barGap={6}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              {etiquetaMesActual && (
                <ReferenceArea
                  x1={etiquetaMesActual}
                  x2={etiquetaMesActual}
                  fill="#ecfdf5"
                  fillOpacity={0.85}
                  stroke="#10b981"
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                />
              )}
              <XAxis
                dataKey="etiqueta"
                tick={({ x, y, payload }) => {
                  const esActual = payload.value === etiquetaMesActual;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={14}
                        textAnchor="middle"
                        fill={esActual ? '#047857' : '#475569'}
                        fontSize={esActual ? 12.5 : 11.5}
                        fontWeight={esActual ? 800 : 700}
                      >
                        {payload.value}
                      </text>
                      {esActual && (
                        <text
                          x={0}
                          y={26}
                          textAnchor="middle"
                          fill="#059669"
                          fontSize={9.5}
                          fontWeight={800}
                        >
                          ● Actual
                        </text>
                      )}
                    </g>
                  );
                }}
                height={42}
              />
              <YAxis
                width={48}
                tickFormatter={(v) =>
                  v >= 1000 || v <= -1000 ? `S/${(Number(v) / 1000).toFixed(0)}k` : `S/${v}`
                }
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => formatSoles(value)}
                contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontWeight: 600 }} />

              {seriesActivas.ingresos && (
                <Bar dataKey="ingresos" name="Ingresos" fill="#059669" barSize={28} radius={[7, 7, 0, 0]} animationDuration={600}>
                  <LabelList
                    dataKey="ingresos"
                    position="top"
                    formatter={formatSolesEntero}
                    style={{ fontSize: '12px', fontWeight: 800, fill: '#065f46' }}
                  />
                </Bar>
              )}

              {seriesActivas.gastos && (
                <Bar dataKey="gastos" name="Gastos" fill="#e11d48" barSize={28} radius={[7, 7, 0, 0]} animationDuration={600}>
                  <LabelList
                    dataKey="gastos"
                    position="top"
                    formatter={formatSolesEntero}
                    style={{ fontSize: '12px', fontWeight: 800, fill: '#9f1239' }}
                  />
                </Bar>
              )}

              {seriesActivas.disponible && (
                <Bar dataKey="disponible" name="Disponible" fill="#6366f1" barSize={28} radius={[7, 7, 0, 0]} animationDuration={600}>
                  <LabelList
                    dataKey="disponible"
                    position="top"
                    formatter={formatSolesEntero}
                    style={{ fontSize: '12px', fontWeight: 800, fill: '#3730a3' }}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
        <p className="chart-scroll-hint">Desliza horizontalmente para ver otros meses</p>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          2. GRÁFICO 2: AHORRO EN BARRAS POR MES
          ============================================================ */}
      <div className="panel-card">
        <button
          type="button"
          className="report-accordion-toggle"
          onClick={() => setMostrarAhorroMes(!mostrarAhorroMes)}
        >
          <div className="section-title-with-icon">
            <BarChart3 size={20} style={{ color: '#0284c7' }} />
            <div className="rat-texts">
              <h3>2. Ahorro en barras por mes</h3>
              <small>Total ahorrado en el rango: {formatSoles(evolutivo.totales?.ahorro, 0)}</small>
            </div>
          </div>
          <span className="rat-pill">
            <span>{mostrarAhorroMes ? 'Ocultar' : 'Ver gráfico'}</span>
            {mostrarAhorroMes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        <AnimatePresence initial={false}>
        {mostrarAhorroMes && (
          <motion.div
            className="report-accordion-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="bar-chart-scroll-x" ref={scrollChart2Ref}>
              <div
                className="bar-chart-inner"
                style={{ minWidth: `${Math.max((evolutivo.meses?.length || 6) * 100, 440)}px` }}
              >
              <ResponsiveContainer width="100%" height={265}>
                <BarChart
                  data={evolutivo.meses || []}
                  margin={{ top: 28, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  {etiquetaMesActual && (
                    <ReferenceArea
                      x1={etiquetaMesActual}
                      x2={etiquetaMesActual}
                      fill="#f0f9ff"
                      fillOpacity={0.85}
                      stroke="#0284c7"
                      strokeOpacity={0.3}
                      strokeDasharray="4 4"
                    />
                  )}
                  <XAxis
                    dataKey="etiqueta"
                    tick={({ x, y, payload }) => {
                      const esActual = payload.value === etiquetaMesActual;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={14}
                            textAnchor="middle"
                            fill={esActual ? '#0369a1' : '#475569'}
                            fontSize={esActual ? 12.5 : 11.5}
                            fontWeight={esActual ? 800 : 700}
                          >
                            {payload.value}
                          </text>
                          {esActual && (
                            <text
                              x={0}
                              y={26}
                              textAnchor="middle"
                              fill="#0284c7"
                              fontSize={9.5}
                              fontWeight={800}
                            >
                              ● Actual
                            </text>
                          )}
                        </g>
                      );
                    }}
                    height={42}
                  />
                  <YAxis
                    width={48}
                    tickFormatter={(v) =>
                      v >= 1000 ? `S/${(Number(v) / 1000).toFixed(0)}k` : `S/${v}`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => formatSoles(value)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
                  />
                  <Bar dataKey="ahorro" name="Ahorro" fill="#0284c7" barSize={42} radius={[8, 8, 0, 0]} animationDuration={650}>
                    <LabelList
                      dataKey="ahorro"
                      position="top"
                      formatter={formatSolesEntero}
                      style={{ fontSize: '12.5px', fontWeight: 800, fill: '#075985' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          2. TABLA DINÁMICA DE RESUMEN (SEGUNDA Y COLAPSADA POR DEFECTO)
          ============================================================ */}
      <div className="panel-card">
        <button
          type="button"
          className="report-accordion-toggle"
          onClick={() => setMostrarTablaDinamica(!mostrarTablaDinamica)}
        >
          <div className="section-title-with-icon">
            <Table2 size={20} className="icon-forest" />
            <div className="rat-texts">
              <h3>Tabla Dinámica de Resumen</h3>
              <small>Desglose interactivo por Área, Rubro y Concepto ({txFiltradas.total || 0} movimientos)</small>
            </div>
          </div>
          <span className="rat-pill">
            <span>{mostrarTablaDinamica ? 'Ocultar' : 'Ver tabla'}</span>
            {mostrarTablaDinamica ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {mostrarTablaDinamica && (
          <div className="report-accordion-body">
            <TablaDinamica
              transacciones={txFiltradas.items || []}
              taxonomia={taxonomia}
              mediosPago={mediosPago}
              periodoEtiqueta={porNivel?.periodo?.etiqueta}
              onEditTransaccion={onEditTransaccion}
              onDeleteTransaccion={(txOrId) =>
                onDeleteTransaccion(typeof txOrId === 'object' ? txOrId.id : txOrId)
              }
              onQuickAddTransaccion={onQuickAddTransaccion}
            />
          </div>
        )}
      </div>
    </div>
  );
}
