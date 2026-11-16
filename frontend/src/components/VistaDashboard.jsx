// ============================================================
// Vista Principal: Resumen Familiar y Accesos de Bolsillo (Brief 6.1)
// Fórmulas exactas conservadas por debajo, pero explicadas en español
// sencillo y con nombres 100% estéticos sin códigos de Excel.
// ============================================================
import React from 'react';
import {
  Trash2,
  Pencil,
  ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  formatSoles,
  formatFechaCorta,
  PALETA_DONA,
  getMetaCategoria,
  nombreCategoria,
  nombreSubcategoria,
  nombreMedioPago
} from '../utils/format';
import { CategoriaIcon, SubcategoriaIcon, MedioPagoIcon } from './IconoFamicash';

export default function VistaDashboard({
  resumen,
  transacciones = [],
  onDrillCategoria,
  onEditTransaccion,
  onDeleteTransaccion,
  onGoToView
}) {
  const actual = resumen?.actual || {
    ingresos: 0,
    gastos: 0,
    disponible: 0,
    ahorros: 0,
    total: 0
  };
  const distribucion = resumen?.distribucion || [];

  return (
    <div className="dashboard-container">
      {/* Cuerpo en 2 columnas: ¿En qué se va el dinero? + Últimos Movimientos */}
      <div className="dashboard-two-cols">
        {/* Columna 1: Gráfico de Dona con nombres amigables */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>¿En qué se va el dinero?</h3>
              <p>Reparto de gastos en {resumen?.periodo?.etiqueta} (toca uno para ver el detalle)</p>
            </div>
            <button
              type="button"
              className="btn-link-subtle"
              onClick={() => onGoToView('reports')}
            >
              Ver gráficos →
            </button>
          </div>

          {distribucion.length === 0 ? (
            <div className="empty-state-box">
              No hay gastos registrados en este periodo.
            </div>
          ) : (
            <div className="donut-layout-wrap">
              <div className="donut-chart-box">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={distribucion}
                      dataKey="monto"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {distribucion.map((entry, index) => (
                        <Cell
                          key={entry.categoriaId}
                          fill={getMetaCategoria(entry.categoria).color || PALETA_DONA[index % PALETA_DONA.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [formatSoles(val), nombreCategoria(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center-label">
                  <small>Total Gastado</small>
                  <strong>{formatSoles(actual.gastos, 0)}</strong>
                </div>
              </div>

              <div className="donut-legend-list">
                {distribucion.map((item, idx) => {
                  const meta = getMetaCategoria(item.categoria);
                  return (
                    <button
                      key={item.categoriaId}
                      type="button"
                      className="donut-legend-row"
                      onClick={() => onDrillCategoria(item)}
                      title="Ver en qué se gastó dentro de este grupo"
                    >
                      <span
                        className="legend-dot"
                        style={{ background: meta.color || PALETA_DONA[idx % PALETA_DONA.length] }}
                      />
                      <div className="legend-name-col">
                        <strong className="legend-name-with-icon">
                          <CategoriaIcon codigo={item.categoria} size={15} />
                          <span>{meta.nombre}</span>
                        </strong>
                        <small>{meta.descripcion}</small>
                      </div>
                      <div className="legend-amount-col">
                        <strong>{formatSoles(item.monto)}</strong>
                        <span>{item.pct}%</span>
                      </div>
                      <ChevronRight size={15} className="legend-chevron" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: Últimos movimientos del periodo con nombres limpios */}
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Últimos Movimientos</h3>
              <p>Lo último que anotaron en casa (puedes corregir o borrar)</p>
            </div>
            <button
              type="button"
              className="btn-link-subtle"
              onClick={() => onGoToView('reports')}
            >
              Ver todos ({transacciones.length}) →
            </button>
          </div>

          {transacciones.length === 0 ? (
            <div className="empty-state-box">
              Sin movimientos anotados en este periodo.
            </div>
          ) : (
            <div className="tx-compact-list">
              {transacciones.slice(0, 10).map((tx) => {
                const meta = getMetaCategoria(tx.categoria);
                return (
                  <div key={tx.id} className="tx-row-item">
                    <div
                      className="tx-badge-cat"
                      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                    >
                      {formatFechaCorta(tx.fecha)}
                    </div>

                    <div className="tx-main-info">
                      <div className="tx-title-line">
                        <SubcategoriaIcon
                          codigo={tx.subcategoria}
                          categoriaCodigo={tx.categoria}
                          size={15}
                        />
                        <strong>{tx.detalle || nombreSubcategoria(tx.subcategoria)}</strong>
                        {tx.clase && <span className="tx-class-tag">{tx.clase}</span>}
                      </div>
                      <div className="tx-sub-line">
                        <span className="tx-cat-inline">
                          <CategoriaIcon codigo={tx.categoria} size={13} />
                          {nombreCategoria(tx.categoria)}
                        </span>
                        <span>›</span>
                        <span>{nombreSubcategoria(tx.subcategoria)}</span>
                        {tx.medioPago && (
                          <>
                            <span>·</span>
                            <span className="tx-medio-tag">
                              <MedioPagoIcon nombre={tx.medioPago} size={12} />
                              {nombreMedioPago(tx.medioPago)}
                            </span>
                          </>
                        )}
                      </div>
                      {tx.observaciones && (
                        <div className="tx-obs-line">“{tx.observaciones}”</div>
                      )}
                    </div>

                    <div className="tx-right-col">
                      <span className={`tx-amount-val ${tx.tipo.toLowerCase()}`}>
                        {tx.tipo === 'GASTO' ? '-' : '+'}
                        {formatSoles(tx.monto)}
                      </span>
                      <div className="tx-row-actions">
                        <button
                          type="button"
                          className="tx-icon-btn"
                          onClick={() => onEditTransaccion(tx)}
                          title="Editar movimiento"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="tx-icon-btn danger"
                          onClick={() => onDeleteTransaccion(tx.id)}
                          title="Eliminar movimiento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
