// ============================================================
// Vista Principal: Resumen Familiar (KPIs + Pie Orgánico con Zoom)
//  - Insights calculados: Disponible (Ingresos - Gastos), Ingresos, Gastos
//  - Gráfico único de dona con zoom orgánico a subcategorías al tocar un área
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  ZoomIn
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import {
  formatSoles,
  PALETA_DONA,
  getMetaCategoria,
  nombreCategoria,
  nombreSubcategoria
} from '../utils/format';
import { CategoriaIcon, SubcategoriaIcon } from './IconoFamicash';

const SUB_PALETA = [
  '#0f766e',
  '#0284c7',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#4f46e5',
  '#be123c',
  '#0891b2'
];

export default function VistaDashboard({
  resumen,
  filtros = {},
  periodoTipo = 'MENSUAL',
  periodoClave = '',
  presupuestosMensuales = [],
  onGoToView
}) {
  const actual = resumen?.actual || {
    ingresos: 0,
    gastos: 0,
    disponible: 0,
    ahorros: 0,
    total: 0
  };
  const variacion = resumen?.variacion || {};
  const distribucion = resumen?.distribucion || [];

  // Estado para zoom orgánico dentro del mismo gráfico de pie
  const [zoomCat, setZoomCat] = useState(null);
  const [subItems, setSubItems] = useState([]);
  const [cargandoZoom, setCargandoZoom] = useState(false);

  // Si cambia el periodo o filtros, volver al nivel de categorías
  useEffect(() => {
    setZoomCat(null);
    setSubItems([]);
  }, [periodoTipo, periodoClave, filtros]);

  const handleZoomCategoria = async (catItem) => {
    if (!catItem?.categoriaId) return;
    setZoomCat(catItem);
    setCargandoZoom(true);
    try {
      const res = await api.getPorNivel({
        ...filtros,
        periodoTipo,
        periodo: periodoClave,
        nivel: 'subcategoria',
        tipo: 'GASTO',
        categoriaIds: [catItem.categoriaId]
      });
      setSubItems(res?.items || []);
    } catch (err) {
      console.error('Error cargando subcategorías:', err);
      setSubItems([]);
    } finally {
      setCargandoZoom(false);
    }
  };

  const handleVolverCategorias = () => {
    setZoomCat(null);
    setSubItems([]);
  };

  const disponibleCalc = Number(actual.ingresos || 0) - Number(actual.gastos || 0);
  const disponiblePositivo = disponibleCalc >= 0;

  const renderVar = (val) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    const signo = num > 0 ? '+' : '';
    return `${signo}${num}% vs anterior`;
  };

  const metaZoom = zoomCat ? getMetaCategoria(zoomCat.categoria) : null;
  const datosPie = zoomCat ? subItems : distribucion;

  const topePorCategoria = new Map(
    presupuestosMensuales.filter((p) => !p.subcategoriaId).map((p) => [p.categoriaId, p])
  );
  const topePorSubcategoria = new Map(
    presupuestosMensuales.filter((p) => p.subcategoriaId).map((p) => [p.subcategoriaId, p])
  );

  return (
    <motion.div
      className="dashboard-container"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Insights calculados: Disponible | Ingresos | Gastos */}
      <div className="resumen-kpi-grid">
        <div className={`resumen-kpi-card disponible ${disponiblePositivo ? 'positivo' : 'negativo'}`}>
          <div className="rk-top">
            <span className="rk-label">Disponible</span>
            <span className="rk-icon-wrap">
              <Wallet size={17} />
            </span>
          </div>
          <strong className="rk-value">{formatSoles(disponibleCalc)}</strong>
          <span className="rk-sub">
            Ingresos − Gastos
            {variacion.disponible !== null && variacion.disponible !== undefined
              ? ` · ${renderVar(variacion.disponible)}`
              : ''}
          </span>
        </div>

        <div className="resumen-kpi-card ingresos">
          <div className="rk-top">
            <span className="rk-label">Ingresos</span>
            <span className="rk-icon-wrap">
              <TrendingUp size={17} />
            </span>
          </div>
          <strong className="rk-value">{formatSoles(actual.ingresos)}</strong>
          <span className="rk-sub">
            {renderVar(variacion.ingresos) || `En ${resumen?.periodo?.etiqueta || 'el periodo'}`}
          </span>
        </div>

        <div className="resumen-kpi-card gastos">
          <div className="rk-top">
            <span className="rk-label">Gastos</span>
            <span className="rk-icon-wrap">
              <TrendingDown size={17} />
            </span>
          </div>
          <strong className="rk-value">{formatSoles(actual.gastos)}</strong>
          <span className="rk-sub">
            {renderVar(variacion.gastos) || `En ${resumen?.periodo?.etiqueta || 'el periodo'}`}
          </span>
        </div>
      </div>

      {/* Gráfico único de Dona con zoom orgánico */}
      <div className="dashboard-single-col">
        <div className="panel-card resumen-pie-card">
          <div className="panel-card-header wrap-header">
            <div className="pie-header-left">
              {zoomCat ? (
                <div className="pie-zoom-header">
                  <button
                    type="button"
                    className="btn-pie-back"
                    onClick={handleVolverCategorias}
                  >
                    <ArrowLeft size={15} />
                    <span>Todas las áreas</span>
                  </button>
                  <div>
                    <h3 className="pie-zoom-title">
                      <CategoriaIcon codigo={zoomCat.categoria} size={18} />
                      <span>{metaZoom?.nombre}</span>
                    </h3>
                    <p>
                      Subcategorías en {resumen?.periodo?.etiqueta} ({zoomCat.pct}% del gasto total)
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3>¿En qué se va el dinero?</h3>
                  <p>
                    Reparto de gastos en {resumen?.periodo?.etiqueta} — toca una categoría para hacer zoom
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-link-subtle"
              onClick={() => onGoToView('reports')}
            >
              Ver gráficos →
            </button>
          </div>

          {cargandoZoom ? (
            <div className="empty-state-box">Cargando detalle de subcategorías...</div>
          ) : datosPie.length === 0 ? (
            <div className="empty-state-box">
              No hay gastos registrados en este periodo.
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={zoomCat ? `zoom-${zoomCat.categoriaId}` : 'categorias'}
                className="donut-layout-wrap"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
              <div className="donut-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosPie}
                      dataKey="monto"
                      nameKey={zoomCat ? 'nombre' : 'categoria'}
                      cx="50%"
                      cy="50%"
                      innerRadius="56%"
                      outerRadius="84%"
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={550}
                      animationEasing="ease-out"
                      onClick={(entry) => {
                        if (!zoomCat && entry) {
                          handleZoomCategoria(entry);
                        }
                      }}
                      style={{ cursor: zoomCat ? 'default' : 'pointer' }}
                    >
                      {datosPie.map((entry, index) => (
                        <Cell
                          key={zoomCat ? entry.id || index : entry.categoriaId}
                          fill={
                            zoomCat
                              ? SUB_PALETA[index % SUB_PALETA.length]
                              : getMetaCategoria(entry.categoria).color || PALETA_DONA[index % PALETA_DONA.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [
                        formatSoles(val),
                        zoomCat ? nombreSubcategoria(name) : nombreCategoria(name)
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center-label">
                  <small>{zoomCat ? metaZoom?.nombre : 'Total Gastado'}</small>
                  <strong>{formatSoles(zoomCat ? zoomCat.monto : actual.gastos, 0)}</strong>
                </div>
              </div>

              <div className="donut-legend-list">
                {!zoomCat
                  ? distribucion.map((item, idx) => {
                      const meta = getMetaCategoria(item.categoria);
                      const tope = topePorCategoria.get(item.categoriaId);
                      return (
                        <button
                          key={item.categoriaId}
                          type="button"
                          className="donut-legend-row"
                          onClick={() => handleZoomCategoria(item)}
                          title="Hacer zoom en las subcategorías de esta área"
                        >
                          <span
                            className="legend-dot"
                            style={{ background: meta.color || PALETA_DONA[idx % PALETA_DONA.length] }}
                          />
                          <div className="legend-name-col">
                            <strong className="legend-name-with-icon">
                              <CategoriaIcon codigo={item.categoria} size={15} />
                              <span>{meta.nombre}</span>
                              {tope && (
                                <span className={`mini-tope-pill ${tope.estado.toLowerCase()}`}>
                                  {tope.pct}% tope
                                </span>
                              )}
                            </strong>
                            <small>{meta.descripcion}</small>
                          </div>
                          <div className="legend-amount-col">
                            <strong>{formatSoles(item.monto)}</strong>
                            <span>{item.pct}%</span>
                          </div>
                          <ZoomIn size={15} className="legend-chevron" />
                        </button>
                      );
                    })
                  : subItems.map((sub, idx) => {
                      const topeSub = topePorSubcategoria.get(sub.id);
                      return (
                      <div key={sub.id || idx} className="donut-legend-row static-sub-row">
                        <span
                          className="legend-dot"
                          style={{ background: SUB_PALETA[idx % SUB_PALETA.length] }}
                        />
                        <div className="legend-name-col">
                          <strong className="legend-name-with-icon">
                            <SubcategoriaIcon
                              codigo={sub.nombre}
                              categoriaCodigo={zoomCat.categoria}
                              size={15}
                            />
                            <span>{nombreSubcategoria(sub.nombre)}</span>
                            {topeSub && (
                              <span className={`mini-tope-pill ${topeSub.estado.toLowerCase()}`}>
                                {topeSub.pct}% tope
                              </span>
                            )}
                          </strong>
                          <small>{sub.cantidad} {sub.cantidad === 1 ? 'movimiento' : 'movimientos'}</small>
                        </div>
                        <div className="legend-amount-col">
                          <strong>{formatSoles(sub.monto)}</strong>
                          <span>{sub.pct}%</span>
                        </div>
                        <ChevronRight size={14} className="legend-chevron muted" />
                      </div>
                      );
                    })}
              </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
