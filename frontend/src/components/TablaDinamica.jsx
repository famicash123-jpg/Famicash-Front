// ============================================================
// Tabla Dinámica Interactiva estilo Excel (Área -> Rubro -> Concepto -> Movimientos)
//  - Despliega/colapsa niveles con un clic y muestra subtotales al instante
//  - Para Hogar y Familia (II_GENERALES): muestra alertas visuales en conceptos
//    sin monto en el periodo ("Pendiente") y permite rellenar el monto en 1 clic
//  - Permite editar o eliminar cualquier movimiento directamente
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronsUpDown,
  ChevronsDownUp,
  Table2,
  AlertCircle,
  PlusCircle,
  Check
} from 'lucide-react';
import {
  formatSoles,
  formatFechaCorta,
  getMetaCategoria,
  nombreCategoria,
  nombreSubcategoria,
  nombreMedioPago,
  hoyISO
} from '../utils/format';
import {
  CategoriaIcon,
  SubcategoriaIcon,
  ConceptoIcon,
  MedioPagoIcon
} from './IconoFamicash';

export default function TablaDinamica({
  transacciones = [],
  taxonomia = [],
  mediosPago = [],
  periodoEtiqueta = '',
  onEditTransaccion,
  onDeleteTransaccion,
  onQuickAddTransaccion
}) {
  const [tipoFiltro, setTipoFiltro] = useState('TODOS'); // TODOS | GASTO | INGRESO | AHORRO
  const [busqueda, setBusqueda] = useState('');
  const [expandidos, setExpandidos] = useState({});

  // Estado para agregar monto rápido en línea sobre cualquier concepto
  const [quickTarget, setQuickTarget] = useState(null); // { key, subcategoriaId, detalleId, nombre }
  const [quickMonto, setQuickMonto] = useState('');
  const [quickMedioId, setQuickMedioId] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  // Construir árbol jerárquico + inyectar conceptos pendientes de II_GENERALES (Hogar y Familia)
  const { arbol, totalGeneral, conteoTotal, totalesPorTipo, totalPendientesHogar } = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const txsFiltradas = transacciones.filter((tx) => {
      if (tipoFiltro !== 'TODOS' && tx.tipo !== tipoFiltro) return false;
      if (!q) return true;
      const catNom = nombreCategoria(tx.categoria).toLowerCase();
      const subNom = nombreSubcategoria(tx.subcategoria).toLowerCase();
      const detNom = (tx.detalle || '').toLowerCase();
      const obsNom = (tx.observaciones || '').toLowerCase();
      return (
        catNom.includes(q) ||
        subNom.includes(q) ||
        detNom.includes(q) ||
        obsNom.includes(q)
      );
    });

    const catMap = new Map();
    let sumaGeneral = 0;
    const porTipo = { INGRESO: 0, GASTO: 0, AHORRO: 0 };

    const ensureArea = (catCodigo, tipo = 'GASTO') => {
      if (!catMap.has(catCodigo)) {
        catMap.set(catCodigo, {
          key: `cat:${catCodigo}`,
          codigo: catCodigo,
          nombre: nombreCategoria(catCodigo),
          tipo,
          total: 0,
          cantidad: 0,
          pendientes: 0,
          rubrosMap: new Map()
        });
      }
      return catMap.get(catCodigo);
    };

    const ensureRubro = (catNode, subCodigo, subId = null) => {
      if (!catNode.rubrosMap.has(subCodigo)) {
        catNode.rubrosMap.set(subCodigo, {
          key: `sub:${catNode.codigo}:${subCodigo}`,
          id: subId,
          codigo: subCodigo,
          nombre: nombreSubcategoria(subCodigo),
          total: 0,
          cantidad: 0,
          pendientes: 0,
          conceptosMap: new Map()
        });
      }
      const r = catNode.rubrosMap.get(subCodigo);
      if (!r.id && subId) r.id = subId;
      return r;
    };

    const ensureConcepto = (subNode, catCodigo, detNombre, detId = null, esGeneral = false) => {
      if (!subNode.conceptosMap.has(detNombre)) {
        subNode.conceptosMap.set(detNombre, {
          key: `det:${catCodigo}:${subNode.codigo}:${detNombre}`,
          id: detId,
          subcategoriaId: subNode.id,
          nombre: detNombre,
          esGeneral,
          total: 0,
          cantidad: 0,
          items: []
        });
      }
      const c = subNode.conceptosMap.get(detNombre);
      if (!c.id && detId) c.id = detId;
      if (!c.subcategoriaId && subNode.id) c.subcategoriaId = subNode.id;
      return c;
    };

    // 1. Pre-poblar II_GENERALES (Hogar y Familia) desde la taxonomía para detectar pendientes
    const catHogar = taxonomia.find((c) => c.codigo === 'II_GENERALES');
    if (catHogar && (tipoFiltro === 'TODOS' || tipoFiltro === 'GASTO')) {
      const hogarNode = ensureArea('II_GENERALES', 'GASTO');
      for (const sub of catHogar.subcategorias || []) {
        const subNombre = nombreSubcategoria(sub.codigo);
        const subNode = ensureRubro(hogarNode, sub.codigo, sub.id);
        for (const det of sub.detalles || []) {
          const matchQ =
            !q ||
            hogarNode.nombre.toLowerCase().includes(q) ||
            subNombre.toLowerCase().includes(q) ||
            det.nombre.toLowerCase().includes(q);
          if (matchQ) {
            ensureConcepto(subNode, 'II_GENERALES', det.nombre, det.id, false);
          }
        }
      }
    }

    // 2. Sumar las transacciones reales del periodo
    for (const tx of txsFiltradas) {
      const monto = Number(tx.monto || 0);
      sumaGeneral += monto;
      if (porTipo[tx.tipo] !== undefined) porTipo[tx.tipo] += monto;

      const catKey = tx.categoria || 'SIN_AREA';
      const catNode = ensureArea(catKey, tx.tipo);
      catNode.total += monto;
      catNode.cantidad += 1;

      const subKey = tx.subcategoria || 'SIN_RUBRO';
      const subNode = ensureRubro(catNode, subKey, tx.subcategoriaId);
      subNode.total += monto;
      subNode.cantidad += 1;

      const detNombre = tx.detalle || 'General (sin concepto)';
      const detNode = ensureConcepto(subNode, catKey, detNombre, tx.detalleId, !tx.detalle);
      detNode.total += monto;
      detNode.cantidad += 1;
      detNode.items.push(tx);
    }

    // 3. Calcular pendientes en II_GENERALES (conceptos con 0 registros)
    let pendientesHogar = 0;
    const hogarNode = catMap.get('II_GENERALES');
    if (hogarNode) {
      for (const subNode of hogarNode.rubrosMap.values()) {
        let subPend = 0;
        for (const detNode of subNode.conceptosMap.values()) {
          if (!detNode.esGeneral && detNode.cantidad === 0) {
            subPend += 1;
            detNode.pendienteHogar = true;
          }
        }
        subNode.pendientes = subPend;
        hogarNode.pendientes += subPend;
      }
      pendientesHogar = hogarNode.pendientes;
    }

    const ordenAreas = ['0_AHORRO', 'I_INGRESOS', 'II_GENERALES', 'III_LARA', 'IV_VANESSA', 'V_ANTHONY', 'VI_AHORRO'];
    const areas = Array.from(catMap.values())
      .map((c) => ({
        ...c,
        rubros: Array.from(c.rubrosMap.values())
          .map((r) => ({
            ...r,
            conceptos: Array.from(r.conceptosMap.values()).sort((a, b) => {
              // Pendientes primero dentro de II_GENERALES o por monto descendente
              if (a.cantidad === 0 && b.cantidad > 0) return -1;
              if (b.cantidad === 0 && a.cantidad > 0) return 1;
              return b.total - a.total;
            })
          }))
          .filter((r) => r.conceptos.length > 0 || r.cantidad > 0)
          .sort((a, b) => b.total - a.total)
      }))
      .sort((a, b) => {
        const ia = ordenAreas.indexOf(a.codigo);
        const ib = ordenAreas.indexOf(b.codigo);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return b.total - a.total;
      });

    return {
      arbol: areas,
      totalGeneral: sumaGeneral,
      conteoTotal: txsFiltradas.length,
      totalesPorTipo: porTipo,
      totalPendientesHogar: pendientesHogar
    };
  }, [transacciones, taxonomia, tipoFiltro, busqueda]);

  const toggleNodo = (key) => {
    setExpandidos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandirTodo = () => {
    const next = {};
    for (const area of arbol) {
      next[area.key] = true;
      for (const rubro of area.rubros) {
        next[rubro.key] = true;
      }
    }
    setExpandidos(next);
  };

  const expandirPendientesHogar = () => {
    const hogar = arbol.find((a) => a.codigo === 'II_GENERALES');
    if (!hogar) return;
    const next = { ...expandidos, [hogar.key]: true };
    for (const rubro of hogar.rubros) {
      if (rubro.pendientes > 0) {
        next[rubro.key] = true;
      }
    }
    setExpandidos(next);
  };

  const colapsarTodo = () => {
    setExpandidos({});
  };

  const abrirQuickAdd = (e, concepto, subcategoriaId) => {
    e.stopPropagation();
    setQuickTarget({
      key: concepto.key,
      subcategoriaId: concepto.subcategoriaId || subcategoriaId,
      detalleId: concepto.id || null,
      nombre: concepto.nombre
    });
    setQuickMonto('');
    setQuickMedioId(mediosPago[0]?.id ? String(mediosPago[0].id) : '');
  };

  const guardarQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const montoNum = parseFloat(String(quickMonto).replace(',', '.'));
    if (!quickTarget?.subcategoriaId || !Number.isFinite(montoNum) || montoNum <= 0) return;
    setQuickSaving(true);
    try {
      await onQuickAddTransaccion?.({
        subcategoriaId: quickTarget.subcategoriaId,
        detalleId: quickTarget.detalleId,
        medioPagoId: quickMedioId ? Number(quickMedioId) : null,
        monto: montoNum,
        clase: 'Fijo',
        fecha: hoyISO()
      });
      setQuickTarget(null);
      setQuickMonto('');
    } finally {
      setQuickSaving(false);
    }
  };

  const hayExpandidos = Object.values(expandidos).some(Boolean);

  return (
    <div className="pivot-card-container">
      {/* Cabecera */}
      <div className="panel-card-header wrap-header">
        <div>
          <div className="section-title-with-icon">
            <Table2 size={19} className="icon-forest" />
            <h3>Tabla Dinámica de Resumen</h3>
          </div>
          <p>
            Toca cualquier fila para desplegar rubros, conceptos o editar montos en{' '}
            <strong>{periodoEtiqueta || 'este periodo'}</strong>.
          </p>
        </div>

        <div className="segmented-pills">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'GASTO', label: 'Gastos' },
            { id: 'INGRESO', label: 'Ingresos' },
            { id: 'AHORRO', label: 'Ahorros' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={tipoFiltro === t.id ? 'active' : ''}
              onClick={() => setTipoFiltro(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta visual para gastos pendientes de Hogar y Familia */}
      {totalPendientesHogar > 0 && onQuickAddTransaccion && (
        <div className="pivot-hogar-alert-banner">
          <div className="pha-left">
            <AlertCircle size={17} />
            <span>
              Tienes <strong>{totalPendientesHogar}</strong>{' '}
              {totalPendientesHogar === 1 ? 'gasto fijo' : 'gastos fijos'} de{' '}
              <strong>Hogar y Familia</strong> sin monto este periodo.
            </span>
          </div>
          <button type="button" className="pha-btn" onClick={expandirPendientesHogar}>
            Rellenar pendientes
          </button>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="pivot-toolbar">
        <div className="pivot-search-wrap">
          <Search size={14} />
          <input
            type="text"
            placeholder="Filtrar área, rubro o concepto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} title="Limpiar filtro">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="pivot-expand-actions">
          <button type="button" className="pivot-tool-btn" onClick={expandirTodo}>
            <ChevronsUpDown size={14} />
            <span>Expandir</span>
          </button>
          {hayExpandidos && (
            <button type="button" className="pivot-tool-btn" onClick={colapsarTodo}>
              <ChevronsDownUp size={14} />
              <span>Colapsar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla estilo Excel */}
      {arbol.length === 0 ? (
        <div className="empty-state-box">No hay movimientos para mostrar en la tabla dinámica.</div>
      ) : (
        <div className="pivot-table-scroll">
          <table className="pivot-excel-table">
            <thead>
              <tr>
                <th>Etiquetas de fila</th>
                <th className="num-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {arbol.map((area) => {
                const areaOpen = Boolean(expandidos[area.key] || busqueda.trim());
                const meta = getMetaCategoria(area.codigo);

                return (
                  <React.Fragment key={area.key}>
                    {/* NIVEL 1: ÁREA FAMILIAR */}
                    <tr className="pivot-row level-1" onClick={() => toggleNodo(area.key)}>
                      <td>
                        <div className="pivot-cell-label">
                          <span className="pivot-chevron">
                            {areaOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </span>
                          <CategoriaIcon codigo={area.codigo} size={16} />
                          <strong className="pivot-area-name">{area.nombre}</strong>
                          <span className="pivot-count-pill">{area.cantidad}</span>
                          {area.pendientes > 0 && (
                            <span className="pivot-pending-pill">
                              {area.pendientes} pend.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num-col">
                        <strong style={{ color: meta.color }}>{formatSoles(area.total)}</strong>
                      </td>
                    </tr>

                    {/* NIVEL 2: RUBROS */}
                    {areaOpen &&
                      area.rubros.map((rubro) => {
                        const rubroOpen = Boolean(expandidos[rubro.key] || busqueda.trim());
                        return (
                          <React.Fragment key={rubro.key}>
                            <tr className="pivot-row level-2" onClick={() => toggleNodo(rubro.key)}>
                              <td>
                                <div className="pivot-cell-label indent-1">
                                  <span className="pivot-chevron">
                                    {rubroOpen ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                  </span>
                                  <SubcategoriaIcon
                                    codigo={rubro.codigo}
                                    categoriaCodigo={area.codigo}
                                    size={15}
                                  />
                                  <span className="pivot-rubro-name">{rubro.nombre}</span>
                                  {rubro.pendientes > 0 && (
                                    <span className="pivot-pending-pill subtle">
                                      {rubro.pendientes} pend.
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="num-col">{formatSoles(rubro.total)}</td>
                            </tr>

                            {/* NIVEL 3: CONCEPTOS */}
                            {rubroOpen &&
                              rubro.conceptos.map((concepto) => {
                                const conceptoOpen = Boolean(expandidos[concepto.key]);
                                const esPendiente = Boolean(concepto.pendienteHogar);
                                const isQuickOpen = quickTarget?.key === concepto.key;

                                return (
                                  <React.Fragment key={concepto.key}>
                                    <tr
                                      className={`pivot-row level-3 ${esPendiente ? 'is-pending-row' : ''}`}
                                      onClick={() => {
                                        if (esPendiente && onQuickAddTransaccion) {
                                          setQuickTarget({
                                            key: concepto.key,
                                            subcategoriaId: concepto.subcategoriaId || rubro.id,
                                            detalleId: concepto.id || null,
                                            nombre: concepto.nombre
                                          });
                                          setQuickMonto('');
                                          setQuickMedioId(
                                            mediosPago[0]?.id ? String(mediosPago[0].id) : ''
                                          );
                                        } else {
                                          toggleNodo(concepto.key);
                                        }
                                      }}
                                    >
                                      <td>
                                        <div className="pivot-cell-label indent-2">
                                          <span className="pivot-chevron">
                                            {esPendiente ? (
                                              <AlertCircle size={13} className="icon-pending-amber" />
                                            ) : conceptoOpen ? (
                                              <ChevronDown size={13} />
                                            ) : (
                                              <ChevronRight size={13} />
                                            )}
                                          </span>
                                          <ConceptoIcon size={13} color={meta.color} />
                                          <span
                                            className={`pivot-concepto-name ${concepto.esGeneral ? 'muted' : ''}`}
                                          >
                                            {concepto.nombre}
                                          </span>
                                          {esPendiente && (
                                            <span className="pivot-pending-badge">Pendiente</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="num-col muted-num">
                                        <div className="pivot-concepto-right">
                                          <span>{formatSoles(concepto.total)}</span>
                                          {(area.codigo === 'II_GENERALES' || esPendiente) &&
                                            onQuickAddTransaccion && (
                                              <button
                                                type="button"
                                                className={`pivot-quick-add-btn ${esPendiente ? 'urgent' : ''}`}
                                                onClick={(e) => abrirQuickAdd(e, concepto, rubro.id)}
                                                title={`Agregar monto a ${concepto.nombre}`}
                                              >
                                                <PlusCircle size={13} />
                                                <span>{esPendiente ? 'Rellenar' : '+'}</span>
                                              </button>
                                            )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* FORMULARIO RÁPIDO EN LÍNEA PARA RELLENAR MONTO */}
                                    {isQuickOpen && (
                                      <tr className="pivot-row level-4-quick">
                                        <td colSpan={2}>
                                          <form
                                            className="pivot-quick-inline-form"
                                            onSubmit={guardarQuickAdd}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span className="pqf-label">
                                              Monto para <strong>{concepto.nombre}</strong>:
                                            </span>
                                            <div className="pqf-controls">
                                              <div className="pqf-input-wrap">
                                                <span>S/</span>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0.01"
                                                  autoFocus
                                                  placeholder="0.00"
                                                  value={quickMonto}
                                                  onChange={(e) => setQuickMonto(e.target.value)}
                                                />
                                              </div>
                                              {mediosPago.length > 0 && (
                                                <select
                                                  value={quickMedioId}
                                                  onChange={(e) => setQuickMedioId(e.target.value)}
                                                  className="pqf-select"
                                                >
                                                  {mediosPago.map((mp) => (
                                                    <option key={mp.id} value={mp.id}>
                                                      {nombreMedioPago(mp.nombre)}
                                                    </option>
                                                  ))}
                                                </select>
                                              )}
                                              <button
                                                type="submit"
                                                className="pqf-btn-save"
                                                disabled={quickSaving}
                                              >
                                                <Check size={14} />
                                                <span>{quickSaving ? '...' : 'Guardar'}</span>
                                              </button>
                                              <button
                                                type="button"
                                                className="pqf-btn-cancel"
                                                onClick={() => setQuickTarget(null)}
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          </form>
                                        </td>
                                      </tr>
                                    )}

                                    {/* NIVEL 4: MOVIMIENTOS INDIVIDUALES */}
                                    {conceptoOpen &&
                                      concepto.items.map((tx) => (
                                        <tr key={tx.id} className="pivot-row level-4-tx">
                                          <td>
                                            <div className="pivot-tx-detail indent-3">
                                              <span className="pivot-tx-date">
                                                {formatFechaCorta(tx.fecha)}
                                              </span>
                                              {tx.medioPago && (
                                                <span className="pivot-tx-medio">
                                                  <MedioPagoIcon nombre={tx.medioPago} size={12} />
                                                  <span>{nombreMedioPago(tx.medioPago)}</span>
                                                </span>
                                              )}
                                              {tx.observaciones && (
                                                <span className="pivot-tx-obs">
                                                  “{tx.observaciones}”
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="num-col">
                                            <div className="pivot-tx-right">
                                              <span className={`pivot-tx-amt ${tx.tipo.toLowerCase()}`}>
                                                {formatSoles(tx.monto)}
                                              </span>
                                              <div className="pivot-tx-actions">
                                                <button
                                                  type="button"
                                                  className="tx-icon-btn"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditTransaccion?.(tx);
                                                  }}
                                                  title="Editar movimiento"
                                                >
                                                  <Pencil size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  className="tx-icon-btn danger"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteTransaccion?.(tx);
                                                  }}
                                                  title="Eliminar movimiento"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                  </React.Fragment>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="pivot-grand-total-row">
                <td>
                  <strong>Total general ({conteoTotal} registros)</strong>
                </td>
                <td className="num-col">
                  <strong>{formatSoles(totalGeneral)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {tipoFiltro === 'TODOS' && arbol.length > 0 && (
        <div className="pivot-type-summary-strip">
          <span className="pts-pill ingreso">
            Ingresos: <strong>{formatSoles(totalesPorTipo.INGRESO)}</strong>
          </span>
          <span className="pts-pill gasto">
            Gastos: <strong>{formatSoles(totalesPorTipo.GASTO)}</strong>
          </span>
          <span className="pts-pill ahorro">
            Ahorro: <strong>{formatSoles(totalesPorTipo.AHORRO)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
