// ============================================================
// Vista de Registro Secuencial Horizontal (Wizard 1 -> 2 -> 3 -> 4)
//  - Barra de pasos horizontal para avanzar o regresar a cualquier paso
//  - Muestra un solo paso a la vez para evitar saturación visual
//  - Buscador instantáneo para saltar directo al monto
//  - Iconografía profesional con Lucide (sin emojis sueltos)
// ============================================================
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  Delete,
  Calendar,
  Plus,
  Sparkles,
  X,
  AlertCircle,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Keyboard
} from 'lucide-react';
import { api } from '../api';
import {
  hoyISO,
  getMetaCategoria,
  formatSoles,
  nombreCategoria,
  nombreSubcategoria,
  nombreMedioPago
} from '../utils/format';
import {
  CategoriaIcon,
  SubcategoriaIcon,
  MedioPagoIcon,
  ConceptoIcon
} from './IconoFamicash';

export default function VistaRegistro({
  taxonomia = [],
  mediosPago = [],
  preset = null,
  editandoTx = null,
  onClearEdit,
  onSaveTransaccion,
  onQuickCreateDetalle,
  onRefreshCatalogos
}) {
  const [pasoActual, setPasoActual] = useState(1); // 1: Área, 2: Rubro, 3: Concepto, 4: Monto y Pago
  const [categoriaId, setCategoriaId] = useState(null);
  const [subcategoriaId, setSubcategoriaId] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [medioPagoId, setMedioPagoId] = useState(mediosPago[0]?.id || null);
  const [montoStr, setMontoStr] = useState('');
  const [clase, setClase] = useState('Cotidiano');
  const [observaciones, setObservaciones] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);

  // Buscador global de rubros y conceptos
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const [filtroRubro, setFiltroRubro] = useState('');

  // Creación rápida sin salir del paso
  const [creandoArea, setCreandoArea] = useState(false);
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState('');
  const [nuevaAreaTipo, setNuevaAreaTipo] = useState('GASTO');

  const [creandoRubro, setCreandoRubro] = useState(false);
  const [nuevoRubroTexto, setNuevoRubroTexto] = useState('');

  const [creandoDetalle, setCreandoDetalle] = useState(false);
  const [nuevoDetalleTexto, setNuevoDetalleTexto] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mostrarTeclado, setMostrarTeclado] = useState(false);
  const [detalleExpandido, setDetalleExpandido] = useState(false);
  const [medioPagoConfirmado, setMedioPagoConfirmado] = useState(false);

  const montoInputRef = useRef(null);

  // Inicializar selección cuando se edita o viene un atajo
  useEffect(() => {
    if (editandoTx) {
      setCategoriaId(editandoTx.categoriaId);
      setSubcategoriaId(editandoTx.subcategoriaId);
      setDetalleId(editandoTx.detalleId || null);
      setMedioPagoId(editandoTx.medioPagoId || mediosPago[0]?.id || null);
      setMontoStr(String(editandoTx.monto || ''));
      setClase(editandoTx.clase || 'Cotidiano');
      setObservaciones(editandoTx.observaciones || '');
      setFecha(editandoTx.fecha || hoyISO());
      setMedioPagoConfirmado(true);
      setPasoActual(4);
      return;
    }

    if (preset) {
      if (preset.categoriaCodigo) {
        const cat = taxonomia.find((c) => c.codigo === preset.categoriaCodigo);
        if (cat) {
          setCategoriaId(cat.id);
          const sub = cat.subcategorias?.[0];
          setSubcategoriaId(sub?.id || null);
          setDetalleId(sub?.detalles?.[0]?.id || null);
          setPasoActual(2);
          return;
        }
      }
      if (preset.subcategoriaId) {
        const cat =
          taxonomia.find((c) => c.id === preset.categoriaId) ||
          taxonomia.find((c) => c.subcategorias.some((s) => s.id === preset.subcategoriaId));
        const sub = cat?.subcategorias.find((s) => s.id === preset.subcategoriaId);
        if (cat && sub) {
          setCategoriaId(cat.id);
          setSubcategoriaId(sub.id);
          setDetalleId(sub.detalles?.[0]?.id || null);
          setPasoActual(4);
          return;
        }
      }
    }

    if (!categoriaId && taxonomia.length > 0) {
      const defCat = taxonomia.find((c) => c.codigo === 'II_GENERALES') || taxonomia[0];
      setCategoriaId(defCat.id);
      const defSub =
        defCat.subcategorias?.find((s) => s.codigo === '_6_ALIMENTACION') ||
        defCat.subcategorias?.[0];
      if (defSub) {
        setSubcategoriaId(defSub.id);
        setDetalleId(defSub.detalles?.[0]?.id || null);
      }
    }
  }, [preset, editandoTx, taxonomia]);

  useEffect(() => {
    if (!medioPagoId && mediosPago.length > 0) {
      setMedioPagoId(mediosPago[0].id);
    }
  }, [mediosPago, medioPagoId]);

  useEffect(() => {
    if (pasoActual === 4) {
      setTimeout(() => {
        montoInputRef.current?.focus();
      }, 120);
    }
  }, [pasoActual]);

  const categoriaActual = taxonomia.find((c) => c.id === categoriaId) || taxonomia[0];
  const subcategorias = categoriaActual?.subcategorias || [];
  const subcategoriaActual =
    subcategorias.find((s) => s.id === subcategoriaId) || subcategorias[0] || null;
  const detalles = subcategoriaActual?.detalles || [];
  const detalleActual = detalles.find((d) => d.id === detalleId) || null;

  // Índice plano para el Buscador Instantáneo
  const resultadosBusqueda = useMemo(() => {
    const q = busquedaGlobal.trim().toLowerCase();
    if (!q) return [];
    const resultados = [];

    for (const cat of taxonomia) {
      const meta = getMetaCategoria(cat.codigo);
      const catNombre = meta.nombre;
      for (const sub of cat.subcategorias || []) {
        const subNombre = nombreSubcategoria(sub.codigo);
        const matchSub =
          subNombre.toLowerCase().includes(q) ||
          sub.codigo.toLowerCase().includes(q) ||
          catNombre.toLowerCase().includes(q);

        if (matchSub) {
          resultados.push({
            key: `sub-${sub.id}`,
            tipoItem: 'rubro',
            cat,
            sub,
            det: sub.detalles?.[0] || null,
            meta,
            titulo: subNombre,
            ruta: `${catNombre} › ${subNombre}`
          });
        }

        for (const det of sub.detalles || []) {
          if (det.nombre.toLowerCase().includes(q)) {
            resultados.push({
              key: `det-${det.id}`,
              tipoItem: 'concepto',
              cat,
              sub,
              det,
              meta,
              titulo: det.nombre,
              ruta: `${catNombre} › ${subNombre} › ${det.nombre}`
            });
          }
        }
      }
    }
    return resultados.slice(0, 12);
  }, [busquedaGlobal, taxonomia]);

  const seleccionarCategoria = (cat) => {
    setCategoriaId(cat.id);
    const primeraSub = cat.subcategorias?.[0] || null;
    setSubcategoriaId(primeraSub?.id || null);
    setDetalleId(primeraSub?.detalles?.[0]?.id || null);
    setFiltroRubro('');
    setErrorMsg('');
    setPasoActual(2);
  };

  const seleccionarSubcategoria = (sub) => {
    setSubcategoriaId(sub.id);
    setDetalleId(null);
    setErrorMsg('');
    setPasoActual(3);
  };

  const seleccionarDetalle = (det) => {
    setDetalleId(det.id);
    setErrorMsg('');
    setMedioPagoConfirmado(false);
    setPasoActual(4);
  };

  const aplicarResultadoBusqueda = (r) => {
    setCategoriaId(r.cat.id);
    setSubcategoriaId(r.sub.id);
    setDetalleId(r.det?.id || null);
    setBusquedaGlobal('');
    setErrorMsg('');
    setMedioPagoConfirmado(false);
    setPasoActual(4);
  };

  // Crear nueva Área Familiar desde el Paso 1
  const handleCrearAreaRapida = async () => {
    if (!nuevaAreaNombre.trim()) return;
    try {
      const creada = await api.crearCategoria({
        codigo: nuevaAreaNombre.trim(),
        tipo: nuevaAreaTipo,
        persona: 'FAMILIA'
      });
      if (onRefreshCatalogos) await onRefreshCatalogos();
      if (creada?.id) {
        setCategoriaId(creada.id);
        setSubcategoriaId(null);
        setDetalleId(null);
        setPasoActual(2);
        setCreandoRubro(true);
      }
      setNuevaAreaNombre('');
      setCreandoArea(false);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo crear el área');
    }
  };

  // Crear nuevo Rubro desde el Paso 2
  const handleCrearRubroRapido = async () => {
    if (!nuevoRubroTexto.trim() || !categoriaActual) return;
    try {
      const creado = await api.crearSubcategoria({
        categoriaId: categoriaActual.id,
        codigo: nuevoRubroTexto.trim(),
        persona: categoriaActual.persona || 'FAMILIA'
      });
      if (onRefreshCatalogos) await onRefreshCatalogos();
      if (creado?.id) {
        setSubcategoriaId(creado.id);
        setDetalleId(null);
      }
      setNuevoRubroTexto('');
      setCreandoRubro(false);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo crear el rubro');
    }
  };

  // Crear nuevo Concepto desde el Paso 3
  const handleAgregarDetalle = async () => {
    if (!nuevoDetalleTexto.trim() || !subcategoriaActual) return;
    try {
      const creado = await onQuickCreateDetalle(subcategoriaActual.id, nuevoDetalleTexto.trim());
      if (creado?.id) {
        setDetalleId(creado.id);
      }
      setNuevoDetalleTexto('');
      setCreandoDetalle(false);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo agregar el concepto');
    }
  };

  const sumarMontoRapido = (valor) => {
    setErrorMsg('');
    const limpio = String(montoStr).replace(',', '.');
    const actual = parseFloat(limpio) || 0;
    setMontoStr(String(Math.round((actual + valor) * 100) / 100));
  };

  const pulsarTecla = (tecla) => {
    setErrorMsg('');
    if (tecla === 'C') {
      setMontoStr('');
      return;
    }
    if (tecla === 'DEL') {
      setMontoStr((prev) => prev.slice(0, -1));
      return;
    }
    if (tecla === '.') {
      if (montoStr.includes('.')) return;
      setMontoStr((prev) => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    setMontoStr((prev) => {
      if (prev.includes('.')) {
        const [, dec] = prev.split('.');
        if (dec && dec.length >= 2) return prev;
      }
      if (prev === '0') return String(tecla);
      if (prev.length >= 9) return prev;
      return prev + String(tecla);
    });
  };

  const handleConfirmar = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setMensajeExito('');

    const limpio = String(montoStr).trim().replace(',', '.');
    const montoNum = parseFloat(limpio);

    if (!subcategoriaActual) {
      setErrorMsg('Esta área aún no tiene un rubro seleccionado. Elige o crea un rubro en el Paso 2.');
      setPasoActual(2);
      return;
    }

    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setErrorMsg('Falta escribir cuánto fue el monto en Soles (S/).');
      montoInputRef.current?.focus();
      return;
    }

    setGuardando(true);
    try {
      await onSaveTransaccion(
        {
          subcategoriaId: subcategoriaActual.id,
          detalleId: detalleId || null,
          medioPagoId: medioPagoId || null,
          monto: montoNum,
          clase,
          observaciones: observaciones.trim() || null,
          fecha
        },
        editandoTx?.id
      );
      setMontoStr('');
      setObservaciones('');
      setMensajeExito(
        editandoTx
          ? 'Movimiento actualizado correctamente.'
          : `Guardado: ${formatSoles(montoNum)} en ${nombreCategoria(categoriaActual?.codigo)} › ${nombreSubcategoria(subcategoriaActual.codigo)}`
      );
      setPasoActual(1);
      setTimeout(() => setMensajeExito(''), 4500);
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  const metaCat = getMetaCategoria(categoriaActual?.codigo);
  const verboAccion =
    categoriaActual?.tipo === 'INGRESO'
      ? 'Anotar Ingreso'
      : categoriaActual?.tipo === 'AHORRO'
        ? 'Guardar Ahorro'
        : 'Anotar Gasto';

  const subcategoriasFiltradas = !filtroRubro.trim()
    ? subcategorias
    : subcategorias.filter((s) =>
        nombreSubcategoria(s.codigo).toLowerCase().includes(filtroRubro.trim().toLowerCase())
      );

  const pasosWizard = [
    {
      num: 1,
      titulo: 'Área',
      subtitulo: categoriaActual ? metaCat.nombre : 'Elegir'
    },
    {
      num: 2,
      titulo: 'Rubro',
      subtitulo: subcategoriaActual ? nombreSubcategoria(subcategoriaActual.codigo) : 'Elegir'
    },
    {
      num: 3,
      titulo: 'Concepto',
      subtitulo: detalleActual ? detalleActual.nombre : 'Opcional'
    },
    {
      num: 4,
      titulo: 'Monto',
      subtitulo: montoStr ? formatSoles(String(montoStr).replace(',', '.')) : 'Registrar'
    }
  ];

  return (
    <div className="pocket-register-shell wizard-shell">
      {editandoTx && (
        <div className="editing-banner">
          <div>
            <strong>Editando movimiento:</strong>{' '}
            <span>{nombreSubcategoria(editandoTx.subcategoria)}</span>
          </div>
          <button type="button" className="btn-cancel-edit" onClick={onClearEdit}>
            <X size={15} /> Cancelar edición
          </button>
        </div>
      )}

      {mensajeExito && (
        <div className="toast-success-inline inline-feedback">
          <Check size={18} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* BUSCADOR INSTANTÁNEO GLOBAL */}
      <div className="register-instant-search-card">
        <div className="register-search-input-wrap">
          <Search size={18} className="search-icon-emerald" />
          <input
            type="text"
            placeholder="¿Buscas rápido un rubro o concepto? (ej. Luz, Sueldo, Gasolina)..."
            value={busquedaGlobal}
            onChange={(e) => setBusquedaGlobal(e.target.value)}
          />
          {busquedaGlobal && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setBusquedaGlobal('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {busquedaGlobal.trim() && (
          <div className="register-search-results">
            {resultadosBusqueda.length === 0 ? (
              <div className="search-empty-msg">
                No se encontró "{busquedaGlobal}". Puedes crearlo en el Paso 2 (Rubro) o Paso 3 (Concepto).
              </div>
            ) : (
              resultadosBusqueda.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className="search-result-item"
                  onClick={() => aplicarResultadoBusqueda(r)}
                >
                  <span className="sr-badge" style={{ background: r.meta.bg, color: r.meta.color }}>
                    {r.tipoItem === 'concepto' ? 'Concepto' : 'Rubro'}
                  </span>
                  <div className="sr-texts">
                    <strong>{r.titulo}</strong>
                    <small>{r.ruta}</small>
                  </div>
                  <span className="sr-select-label">
                    Ir al monto <ArrowRight size={13} />
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          STEPPER HORIZONTAL (1. Área -> 2. Rubro -> 3. Concepto -> 4. Monto)
          ============================================================ */}
      <nav className="wizard-horizontal-stepper" aria-label="Pasos para registrar movimiento">
        {pasosWizard.map((p, idx) => {
          const isActive = pasoActual === p.num;
          const isCompleted = pasoActual > p.num;
          const isReachable =
            p.num === 1 ||
            (p.num === 2 && Boolean(categoriaActual)) ||
            (p.num === 3 && Boolean(subcategoriaActual)) ||
            (p.num === 4 && Boolean(subcategoriaActual));

          return (
            <React.Fragment key={p.num}>
              <button
                type="button"
                className={`wizard-step-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                disabled={!isReachable}
                onClick={() => isReachable && setPasoActual(p.num)}
                style={
                  isActive
                    ? { borderColor: metaCat.color, background: metaCat.bg }
                    : undefined
                }
              >
                <span
                  className="wizard-step-circle"
                  style={
                    isActive || isCompleted
                      ? { background: metaCat.color, color: '#ffffff' }
                      : undefined
                  }
                >
                  {isCompleted ? <Check size={14} strokeWidth={2.5} /> : p.num}
                </span>
                <div className="wizard-step-labels">
                  <span className="wizard-step-title">{p.titulo}</span>
                  <small className="wizard-step-sub" title={p.subtitulo}>
                    {p.subtitulo}
                  </small>
                </div>
              </button>
              {idx < pasosWizard.length - 1 && (
                <ChevronRight size={16} className="wizard-step-connector" />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* ============================================================
          CONTENEDOR DE UN SOLO PASO A LA VEZ (TRANSICIÓN HORIZONTAL)
          ============================================================ */}
      <div className="wizard-stage-card pocket-card" key={`step-${pasoActual}`}>
        {/* PASO 1: ÁREA FAMILIAR */}
        {pasoActual === 1 && (
          <div className="wizard-step-pane">
            <div className="wizard-pane-header">
              <div>
                <span className="wizard-step-kicker" style={{ color: metaCat.color }}>
                  Paso 1 de 4
                </span>
                <h3>Escoge el Área Familiar</h3>
                <p>Selecciona a quién o a qué grupo pertenece este movimiento.</p>
              </div>
              <button
                type="button"
                className="btn-mini-add"
                onClick={() => setCreandoArea(!creandoArea)}
              >
                <Plus size={14} /> Nueva Área
              </button>
            </div>

            {creandoArea && (
              <div className="inline-add-detalle">
                <input
                  type="text"
                  placeholder="Nombre de la nueva área (ej. Mascotas, Negocio)..."
                  value={nuevaAreaNombre}
                  onChange={(e) => setNuevaAreaNombre(e.target.value)}
                />
                <select
                  value={nuevaAreaTipo}
                  onChange={(e) => setNuevaAreaTipo(e.target.value)}
                  className="inline-select-mini"
                >
                  <option value="GASTO">Gasto</option>
                  <option value="INGRESO">Ingreso</option>
                  <option value="AHORRO">Ahorro</option>
                </select>
                <button type="button" className="btn-save-mini" onClick={handleCrearAreaRapida}>
                  Crear Área
                </button>
              </div>
            )}

            <div className="friendly-cats-grid">
              {taxonomia.map((cat) => {
                const isSelected = cat.id === categoriaActual?.id;
                const m = getMetaCategoria(cat.codigo);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`friendly-cat-card ${isSelected ? 'selected' : ''}`}
                    style={
                      isSelected
                        ? { borderColor: m.color, background: m.bg, boxShadow: `0 0 0 2px ${m.color}` }
                        : {}
                    }
                    onClick={() => seleccionarCategoria(cat)}
                  >
                    <CategoriaIcon codigo={cat.codigo} size={20} withBadge />
                    <div className="friendly-cat-info">
                      <strong>{m.nombre}</strong>
                      <small>
                        {cat.subcategorias?.length || 0} rubros ·{' '}
                        {cat.tipo === 'INGRESO' ? 'Ingreso' : cat.tipo === 'AHORRO' ? 'Ahorro' : 'Gasto'}
                      </small>
                    </div>
                    <ChevronRight size={16} className="wizard-card-arrow" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 2: RUBRO DENTRO DEL ÁREA */}
        {pasoActual === 2 && (
          <div className="wizard-step-pane">
            <div className="wizard-pane-header">
              <div className="wizard-header-left-with-back">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => setPasoActual(1)}
                >
                  <ArrowLeft size={16} />
                  <span>Área</span>
                </button>
                <div>
                  <span className="wizard-step-kicker" style={{ color: metaCat.color }}>
                    Paso 2 de 4 · {metaCat.nombre}
                  </span>
                  <h3>Escoge el Rubro</h3>
                </div>
              </div>
              <button
                type="button"
                className="btn-mini-add"
                onClick={() => setCreandoRubro(!creandoRubro)}
              >
                <Plus size={14} /> Nuevo Rubro
              </button>
            </div>

            {creandoRubro && (
              <div className="inline-add-detalle">
                <input
                  type="text"
                  placeholder={`Nuevo rubro dentro de ${metaCat.nombre}...`}
                  value={nuevoRubroTexto}
                  onChange={(e) => setNuevoRubroTexto(e.target.value)}
                />
                <button type="button" className="btn-save-mini" onClick={handleCrearRubroRapido}>
                  Guardar Rubro
                </button>
              </div>
            )}

            {subcategorias.length > 5 && (
              <div className="mini-filter-input">
                <Search size={14} />
                <input
                  type="text"
                  placeholder={`Filtrar rubros de ${metaCat.nombre}...`}
                  value={filtroRubro}
                  onChange={(e) => setFiltroRubro(e.target.value)}
                />
                {filtroRubro && (
                  <button type="button" onClick={() => setFiltroRubro('')}>
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {subcategoriasFiltradas.length === 0 ? (
              <div className="empty-state-box">
                No hay rubros en esta área todavía. Pulsa <strong>+ Nuevo Rubro</strong> arriba para crear el primero.
              </div>
            ) : (
              <div className="friendly-subcats-grid">
                {subcategoriasFiltradas.map((sub) => {
                  const isSelected = sub.id === subcategoriaActual?.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      className={`friendly-subcat-item-btn ${isSelected ? 'selected' : ''}`}
                      style={
                        isSelected
                          ? {
                              borderColor: metaCat.color,
                              background: metaCat.bg,
                              boxShadow: `0 0 0 2px ${metaCat.color}`
                            }
                          : {}
                      }
                      onClick={() => seleccionarSubcategoria(sub)}
                    >
                      <SubcategoriaIcon
                        codigo={sub.codigo}
                        categoriaCodigo={categoriaActual?.codigo}
                        size={17}
                        withBadge
                      />
                      <div className="friendly-sub-text">
                        <strong>{nombreSubcategoria(sub.codigo)}</strong>
                        <small>{sub.detalles?.length || 0} conceptos</small>
                      </div>
                      <ChevronRight size={16} className="wizard-card-arrow" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PASO 3: CONCEPTO ESPECÍFICO */}
        {pasoActual === 3 && (
          <div className="wizard-step-pane">
            <div className="wizard-pane-header">
              <div className="wizard-header-left-with-back">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => setPasoActual(2)}
                >
                  <ArrowLeft size={16} />
                  <span>Rubro</span>
                </button>
                <div>
                  <span className="wizard-step-kicker" style={{ color: metaCat.color }}>
                    Paso 3 de 4 · {subcategoriaActual ? nombreSubcategoria(subcategoriaActual.codigo) : '—'}
                  </span>
                  <h3>Escoge el Concepto</h3>
                </div>
              </div>
              {subcategoriaActual && (
                <button
                  type="button"
                  className="btn-mini-add"
                  onClick={() => setCreandoDetalle(!creandoDetalle)}
                >
                  <Plus size={14} /> Nuevo Concepto
                </button>
              )}
            </div>

            {creandoDetalle && (
              <div className="inline-add-detalle">
                <input
                  type="text"
                  placeholder="Escribe el nuevo concepto (ej. Frutería, Movilidad)..."
                  value={nuevoDetalleTexto}
                  onChange={(e) => setNuevoDetalleTexto(e.target.value)}
                />
                <button type="button" className="btn-save-mini" onClick={handleAgregarDetalle}>
                  Guardar Concepto
                </button>
              </div>
            )}

            {!subcategoriaActual ? (
              <div className="empty-state-box">
                Primero selecciona o crea un Rubro en el Paso 2.
              </div>
            ) : detalles.length === 0 ? (
              <div className="empty-state-box">
                Este rubro aún no tiene conceptos específicos. Puedes continuar directo al monto o pulsar{' '}
                <strong>+ Nuevo Concepto</strong> arriba.
              </div>
            ) : (
              <div className="detalles-chips-wrap">
                {detalles.map((det) => {
                  const active = det.id === detalleId;
                  return (
                    <button
                      key={det.id}
                      type="button"
                      className={`detalle-chip-btn ${active ? 'active' : ''}`}
                      style={active ? { background: metaCat.color, borderColor: metaCat.color } : {}}
                      onClick={() => seleccionarDetalle(det)}
                    >
                      <ConceptoIcon size={14} color={active ? '#ffffff' : metaCat.color} />
                      <span>{det.nombre}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="wizard-pane-footer">
              <button
                type="button"
                className="btn-wizard-back"
                onClick={() => setPasoActual(2)}
              >
                <ArrowLeft size={16} />
                <span>Cambiar Rubro</span>
              </button>
              <button
                type="button"
                className="btn-wizard-next"
                style={{ background: metaCat.color }}
                onClick={() => {
                  setMedioPagoConfirmado(false);
                  setPasoActual(4);
                }}
              >
                <span>{detalleActual ? 'Continuar al monto' : 'Continuar sin concepto'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: PRIMERO MEDIO DE PAGO -> AL ELEGIR DESAPARECE AL DETALLE Y QUEDA EL MONTO */}
        {pasoActual === 4 && (
          <form onSubmit={handleConfirmar} noValidate className="wizard-step-pane">
            <div className="wizard-pane-header">
              <div className="wizard-header-left-with-back">
                <button
                  type="button"
                  className="btn-wizard-back"
                  onClick={() => {
                    if (medioPagoConfirmado && !editandoTx) {
                      setMedioPagoConfirmado(false);
                    } else {
                      setPasoActual(3);
                    }
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>{medioPagoConfirmado && !editandoTx ? 'Medio de pago' : 'Concepto'}</span>
                </button>
                <div>
                  <span className="wizard-step-kicker" style={{ color: metaCat.color }}>
                    Paso 4 de 4
                  </span>
                  <h3>{!medioPagoConfirmado ? '¿Con qué medio de pago fue?' : 'Ingresa el Monto'}</h3>
                </div>
              </div>
            </div>

            {!medioPagoConfirmado ? (
              /* PRIMERO: SELECCIONAR MEDIO DE PAGO (AL TOCAR UNO, DESAPARECE Y PASA AL MONTO) */
              <div className="form-block">
                <div className="medios-chips-grid">
                  {mediosPago.map((mp) => {
                    const active = mp.id === medioPagoId;
                    return (
                      <button
                        key={mp.id}
                        type="button"
                        className={`medio-chip-btn ${active ? 'active' : ''}`}
                        onClick={() => {
                          setMedioPagoId(mp.id);
                          setMedioPagoConfirmado(true);
                          setDetalleExpandido(false);
                          setTimeout(() => montoInputRef.current?.focus(), 80);
                        }}
                      >
                        <MedioPagoIcon nombre={mp.nombre} size={16} />
                        <span>{nombreMedioPago(mp.nombre)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* MONTO EN SOLES (SIEMPRE VISIBLE Y PROTAGONISTA) */}
                <div className="form-block amount-highlight-block">
                  <div
                    className={`amount-input-box ${errorMsg ? 'amount-error-border' : ''}`}
                    style={{ borderColor: errorMsg ? '#e11d48' : metaCat.color }}
                  >
                    <span className="currency-prefix" style={{ color: metaCat.color }}>S/</span>
                    <input
                      ref={montoInputRef}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={montoStr}
                      onChange={(e) => {
                        setErrorMsg('');
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setMontoStr(val);
                      }}
                      className="amount-direct-input"
                    />
                    {montoStr && (
                      <button
                        type="button"
                        className="btn-clear-amount"
                        onClick={() => setMontoStr('')}
                        title="Borrar monto"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  <div className="quick-add-amounts">
                    {[10, 20, 50, 100, 200].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className="quick-amt-chip"
                        onClick={() => sumarMontoRapido(val)}
                      >
                        +S/ {val}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="quick-amt-chip toggle-pad"
                      onClick={() => setMostrarTeclado(!mostrarTeclado)}
                    >
                      <Keyboard size={14} />
                      <span>{mostrarTeclado ? 'Ocultar teclado' : 'Teclado'}</span>
                    </button>
                  </div>

                  {mostrarTeclado && (
                    <div className="numeric-keypad-grid">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={`keypad-key ${k === 'DEL' ? 'key-del' : ''}`}
                          onClick={() => pulsarTecla(k)}
                        >
                          {k === 'DEL' ? <Delete size={18} /> : k}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DETALLE COLAPSADO POR DEFECTO (RUTA + MEDIO DE PAGO + FECHA + NOTA) */}
                <div className="wizard-detail-accordion">
                  <button
                    type="button"
                    className="wizard-detail-toggle"
                    onClick={() => setDetalleExpandido(!detalleExpandido)}
                    style={{ borderColor: metaCat.border, background: metaCat.bg }}
                  >
                    <div className="wdt-summary">
                      <CategoriaIcon codigo={categoriaActual?.codigo} size={15} />
                      <span className="wdt-text">
                        <strong>{metaCat.nombre}</strong>
                        {subcategoriaActual ? ` › ${nombreSubcategoria(subcategoriaActual.codigo)}` : ''}
                        {detalleActual ? ` › ${detalleActual.nombre}` : ''}
                        {' · '}
                        {nombreMedioPago(mediosPago.find((m) => m.id === medioPagoId)?.nombre || '')}
                        {' · '}
                        {fecha === hoyISO() ? 'Hoy' : fecha}
                      </span>
                    </div>
                    <span className="wdt-action" style={{ color: metaCat.color }}>
                      <span>{detalleExpandido ? 'Ocultar' : 'Detalle'}</span>
                      {detalleExpandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </span>
                  </button>

                  {detalleExpandido && (
                    <div className="wizard-detail-body">
                      {/* Ruta clickeable para regresar */}
                      <div className="sh-breadcrumb-steps">
                        <button
                          type="button"
                          className="sh-pill clickable"
                          onClick={() => setPasoActual(1)}
                        >
                          <CategoriaIcon codigo={categoriaActual?.codigo} size={14} />
                          <span>{metaCat.nombre}</span>
                        </button>
                        <ArrowRight size={13} className="sh-arrow" />
                        <button
                          type="button"
                          className="sh-pill clickable"
                          onClick={() => setPasoActual(2)}
                        >
                          <SubcategoriaIcon
                            codigo={subcategoriaActual?.codigo}
                            categoriaCodigo={categoriaActual?.codigo}
                            size={14}
                          />
                          <span>
                            {subcategoriaActual ? nombreSubcategoria(subcategoriaActual.codigo) : 'Sin rubro'}
                          </span>
                        </button>
                        {detalleActual && (
                          <>
                            <ArrowRight size={13} className="sh-arrow" />
                            <button
                              type="button"
                              className="sh-pill strong clickable"
                              style={{ borderColor: metaCat.color, color: metaCat.color }}
                              onClick={() => setPasoActual(3)}
                            >
                              <ConceptoIcon size={13} color={metaCat.color} />
                              <span>{detalleActual.nombre}</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Fecha */}
                      <div className="sh-meta-controls">
                        <div className="discreet-date-wrap">
                          {!mostrarSelectorFecha ? (
                            <button
                              type="button"
                              className="btn-discreet-date"
                              onClick={() => setMostrarSelectorFecha(true)}
                            >
                              <Calendar size={13} />
                              <span>Fecha: {fecha === hoyISO() ? 'Hoy' : fecha}</span>
                            </button>
                          ) : (
                            <input
                              type="date"
                              className="input-discreet-date"
                              value={fecha}
                              onChange={(e) => setFecha(e.target.value || hoyISO())}
                              onBlur={() => setMostrarSelectorFecha(false)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Medio de pago */}
                      <div className="form-block">
                        <label className="step-title-inline">
                          <span>¿Con qué medio de pago fue?</span>
                        </label>
                        <div className="medios-chips-grid">
                          {mediosPago.map((mp) => {
                            const active = mp.id === medioPagoId;
                            return (
                              <button
                                key={mp.id}
                                type="button"
                                className={`medio-chip-btn ${active ? 'active' : ''}`}
                                onClick={() => setMedioPagoId(mp.id)}
                              >
                                <MedioPagoIcon nombre={mp.nombre} size={15} />
                                <span>{nombreMedioPago(mp.nombre)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nota opcional */}
                      <div className="form-block">
                        <label>Nota adicional (opcional)</label>
                        <input
                          type="text"
                          className="obs-text-input"
                          placeholder="Ej. Compras de la semana en Wong, almuerzo familiar..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="alert-error-box inline-feedback">
                    <AlertCircle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-confirm-transaction"
                  style={{ background: metaCat.color }}
                  disabled={guardando}
                >
                  <Sparkles size={19} />
                  <span>
                    {guardando
                      ? 'Guardando...'
                      : editandoTx
                        ? 'Guardar Cambios'
                        : `${verboAccion}${montoStr ? ` por ${formatSoles(String(montoStr).replace(',', '.'))}` : ''}`}
                  </span>
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
