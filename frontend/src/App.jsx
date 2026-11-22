// ============================================================
// FamiCash v2 - App Principal (PC & Móvil Nativo, sin marco falso)
// Con Popups de confirmación de eliminación, edición de perfil y avisos globales
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  PieChart,
  Target,
  Settings,
  LogOut,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  User,
  X,
  Bell,
  Menu,
  ListOrdered,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './api';
import { periodoActual, formatSoles, nombreCategoria, nombreSubcategoria } from './utils/format';
import logoFamicash from './assets/logo-famicash.png';

import BarraPeriodo from './components/BarraPeriodo';
import SegmentadoresFiltro from './components/SegmentadoresFiltro';
import VistaLogin from './components/VistaLogin';
import VistaDashboard from './components/VistaDashboard';
import VistaRegistro from './components/VistaRegistro';
import VistaReportes from './components/VistaReportes';
import VistaMovimientos from './components/VistaMovimientos';
import VistaPresupuestos from './components/VistaPresupuestos';
import VistaObjetivos from './components/VistaObjetivos';
import VistaAdminTaxonomia from './components/VistaAdminTaxonomia';
import './App.css';

const FILTROS_VACIOS = {
  categoriaIds: [],
  subcategoriaIds: [],
  detalleIds: [],
  medioPagoIds: [],
  persona: [],
  tipo: [],
  q: ''
};

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [vista, setVista] = useState('dashboard');

  // Periodo global sincronizado en todas las vistas
  const [periodoTipo, setPeriodoTipo] = useState('MENSUAL');
  const [periodoClave, setPeriodoClave] = useState(periodoActual('MENSUAL'));

  // Filtros en cascada estilo segmentadores de Excel
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Catálogos y datos principales
  const [taxonomia, setTaxonomia] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [transaccionesPeriodo, setTransaccionesPeriodo] = useState([]);
  const [presupuestosMensuales, setPresupuestosMensuales] = useState([]);
  const [mostrarAlertasTopes, setMostrarAlertasTopes] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignorar si el navegador bloquea fullscreen
    }
  };

  // Estado para registro rápido / favoritos / edición / drill-down
  const [presetRegistro, setPresetRegistro] = useState(null);
  const [editandoTx, setEditandoTx] = useState(null);
  const [vistaOrigenEdicion, setVistaOrigenEdicion] = useState('movements');
  const [drillInicial, setDrillInicial] = useState(null);
  const [exportando, setExportando] = useState(false);

  // Popups globales (Confirmar eliminación de movimiento / Editar perfil / Toast)
  const [txAEliminar, setTxAEliminar] = useState(null);
  const [eliminandoTx, setEliminandoTx] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [formPerfil, setFormPerfil] = useState({ nombre: '', passwordActual: '', passwordNueva: '' });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [globalToast, setGlobalToast] = useState('');

  const mostrarToast = (msg) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(''), 3500);
  };

  const cargarCatalogos = useCallback(async () => {
    const [tax, med, favs] = await Promise.all([
      api.getTaxonomia(),
      api.getMediosPago(),
      api.getFavoritos()
    ]);
    setTaxonomia(tax || []);
    setMediosPago(med || []);
    setFavoritos(favs || []);
  }, []);

  const cargarResumenYMovimientos = useCallback(async () => {
    if (!usuario) return;
    try {
      const mesActual = periodoTipo === 'MENSUAL' ? periodoClave : periodoActual('MENSUAL');
      const [res, pres] = await Promise.all([
        api.getResumen({
          ...filtros,
          periodoTipo,
          periodo: periodoClave
        }),
        api.getPresupuestos('MENSUAL', mesActual).catch(() => ({ items: [] }))
      ]);
      setResumen(res);
      setPresupuestosMensuales(pres?.items || []);

      const txs = await api.getTransacciones({
        ...filtros,
        desde: res?.periodo?.desde,
        hasta: res?.periodo?.hasta,
        limite: 100
      });
      setTransaccionesPeriodo(txs?.items || []);
    } catch (err) {
      console.error('Error cargando resumen:', err);
    }
  }, [usuario, filtros, periodoTipo, periodoClave]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.getMe();
        if (res?.usuario) {
          setUsuario(res.usuario);
          return;
        }
      } catch {
        if (sessionStorage.getItem('famicash_logged_out') !== '1') {
          try {
            const auto = await api.login('anthony@famicash.pe', 'famicash123');
            if (auto?.usuario) {
              setUsuario(auto.usuario);
            }
          } catch {
            // mostrará login
          }
        }
      } finally {
        setCheckingAuth(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (usuario) {
      cargarCatalogos();
    }
  }, [usuario, cargarCatalogos]);

  useEffect(() => {
    if (usuario) {
      cargarResumenYMovimientos();
    }
  }, [usuario, cargarResumenYMovimientos, refreshKey]);

  const handleLogin = async (email, password) => {
    sessionStorage.removeItem('famicash_logged_out');
    const res = await api.login(email, password);
    setUsuario(res.usuario);
    setPeriodoTipo('MENSUAL');
    setPeriodoClave(periodoActual('MENSUAL'));
    setVista('dashboard');
  };

  const handleRegister = async (payload) => {
    sessionStorage.removeItem('famicash_logged_out');
    const res = await api.register(payload);
    setUsuario(res.usuario);
    setPeriodoTipo('MENSUAL');
    setPeriodoClave(periodoActual('MENSUAL'));
    setVista('dashboard');
  };

  const handleLogout = async () => {
    sessionStorage.setItem('famicash_logged_out', '1');
    await api.logout().catch(() => null);
    setUsuario(null);
  };

  const handleSaveTransaccion = async (payload, idEditar = null) => {
    if (idEditar) {
      await api.editarTransaccion(idEditar, payload);
      setEditandoTx(null);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setVista(vistaOrigenEdicion || 'movements'), 2000);
      return;
    }
    await api.crearTransaccion(payload);
    setRefreshKey((k) => k + 1);
  };

  // Abrir popup de confirmación antes de eliminar movimiento
  const handleSolicitarEliminarTx = (idOTx) => {
    if (typeof idOTx === 'object' && idOTx !== null) {
      setTxAEliminar(idOTx);
    } else {
      const encontrada = transaccionesPeriodo.find((t) => t.id === idOTx) || { id: idOTx };
      setTxAEliminar(encontrada);
    }
  };

  const handleConfirmarEliminarTx = async () => {
    if (!txAEliminar?.id) return;
    setEliminandoTx(true);
    try {
      await api.eliminarTransaccion(txAEliminar.id);
      setTxAEliminar(null);
      setRefreshKey((k) => k + 1);
      mostrarToast('Movimiento eliminado correctamente.');
    } catch (err) {
      mostrarToast(err.message || 'No se pudo eliminar el movimiento');
    } finally {
      setEliminandoTx(false);
    }
  };

  const handleEditTransaccion = (tx) => {
    setVistaOrigenEdicion(vista === 'register' ? 'movements' : vista);
    setEditandoTx(tx);
    setVista('register');
  };

  const handleCancelarEdicion = () => {
    setEditandoTx(null);
    setVista(vistaOrigenEdicion || 'movements');
  };

  const handleToggleFavorito = async (subcategoriaId) => {
    const actuales = favoritos.map((f) => f.subcategoriaId);
    const existe = actuales.includes(subcategoriaId);
    const nuevos = existe
      ? actuales.filter((id) => id !== subcategoriaId)
      : [...actuales, subcategoriaId];
    const res = await api.guardarFavoritos(nuevos);
    setFavoritos(res || []);
    mostrarToast(existe ? 'Quitado de tus atajos rápidos' : '⭐ Fijado en tus atajos rápidos');
  };

  const handleQuickCreateDetalle = async (subcategoriaId, nombre) => {
    const nuevo = await api.crearDetalle({ subcategoriaId, nombre });
    await cargarCatalogos();
    mostrarToast(`Concepto "${nombre}" creado.`);
    return nuevo;
  };

  const handleExportExcelActual = async () => {
    setExportando(true);
    try {
      await api.exportarExcel({
        ...filtros,
        desde: resumen?.periodo?.desde,
        hasta: resumen?.periodo?.hasta
      });
      mostrarToast('Archivo Excel (.xlsx) descargado.');
    } catch (err) {
      mostrarToast(err.message || 'Error al exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  const abrirModalPerfil = () => {
    setFormPerfil({
      nombre: usuario?.nombre || '',
      passwordActual: '',
      passwordNueva: ''
    });
    setModalPerfil(true);
  };

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    try {
      const updated = await api.updateMe({
        nombre: formPerfil.nombre,
        ...(formPerfil.passwordNueva
          ? { passwordActual: formPerfil.passwordActual, passwordNueva: formPerfil.passwordNueva }
          : {})
      });
      if (updated?.usuario) setUsuario(updated.usuario);
      setModalPerfil(false);
      mostrarToast('¡Perfil actualizado correctamente!');
    } catch (err) {
      mostrarToast(err.message || 'Error al actualizar perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const activeFiltersCount =
    (filtros.categoriaIds?.length || 0) +
    (filtros.subcategoriaIds?.length || 0) +
    (filtros.detalleIds?.length || 0) +
    (filtros.medioPagoIds?.length || 0) +
    (filtros.persona?.length || 0) +
    (filtros.tipo?.length || 0) +
    (filtros.q ? 1 : 0);

  const alertasTopes = [...presupuestosMensuales]
    .filter((p) => p.estado === 'ROJO' || p.estado === 'AMARILLO')
    .sort((a, b) => (b.pct || 0) - (a.pct || 0));
  const tieneRojo = alertasTopes.some((a) => a.estado === 'ROJO');

  if (checkingAuth) {
    return (
      <div className="loading-splash">
        <div className="spinner-ring" />
        <span>Cargando FamiCash...</span>
      </div>
    );
  }

  if (!usuario) {
    return <VistaLogin onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Resumen', sub: 'Balance del hogar', icon: LayoutDashboard },
    { id: 'register', label: 'Anotar', sub: 'Gasto, ingreso o ahorro', icon: PlusCircle, highlight: true },
    { id: 'reports', label: 'Gráficos', sub: 'En qué se va la plata', icon: BarChart3 },
    { id: 'movements', label: 'Últimos Movimientos', sub: 'Historial y comprobantes', icon: ListOrdered },
    { id: 'budgets', label: 'Topes', sub: 'Límites de gasto', icon: PieChart },
    { id: 'goals', label: 'Metas', sub: 'Objetivos de ahorro', icon: Target },
    { id: 'settings', label: 'Excel', sub: 'Descargar y ajustes', icon: Settings }
  ];

  return (
    <div className="famicash-app-shell">
      {/* Notificación flotante global */}
      {globalToast && (
        <div className="floating-global-toast">
          <CheckCircle2 size={18} />
          <span>{globalToast}</span>
        </div>
      )}

      {/* ============================================================
          SIDEBAR LATERAL (Visible en PC / Pantallas >= 960px)
          ============================================================ */}
      <aside className="famicash-sidebar">
        <div className="sidebar-brand-box" onClick={() => setVista('dashboard')}>
          <img src={logoFamicash} alt="FamiCash" className="brand-logo" />
          <span className="brand-sub">Anthony · Vanessa · Lara</span>
        </div>

        <nav className="sidebar-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = vista === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${active ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
                onClick={() => {
                  if (item.id !== 'register') setEditandoTx(null);
                  setVista(item.id);
                }}
              >
                <Icon size={19} />
                <div className="sidebar-link-texts">
                  <span>{item.label}</span>
                  <small>{item.sub}</small>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className={`btn-sidebar-bell ${alertasTopes.length > 0 ? (tieneRojo ? 'danger' : 'warn') : ''}`}
            onClick={() => setMostrarAlertasTopes(true)}
            title="Alertas de topes mensuales"
          >
            <Bell size={16} />
            <span>Alertas de Topes</span>
            {alertasTopes.length > 0 && (
              <span className={`bell-badge ${tieneRojo ? 'rojo' : 'amarillo'}`}>
                {alertasTopes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className="btn-sidebar-excel"
            onClick={handleExportExcelActual}
            disabled={exportando}
          >
            <Download size={16} />
            <span>{exportando ? 'Exportando...' : 'Exportar a Excel'}</span>
          </button>

          <div className="user-profile-pill">
            <button
              type="button"
              className="user-profile-edit-trigger"
              onClick={abrirModalPerfil}
              title="Editar mi perfil o contraseña"
            >
              <div className="user-avatar-circle">
                {(usuario.nombre || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="user-meta-text">
                <strong>{usuario.nombre}</strong>
                <small>{usuario.email}</small>
              </div>
            </button>
            <button
              type="button"
              className="btn-logout-icon"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          ÁREA PRINCIPAL (Adaptativa para PC y Móvil sin bordes falsos)
          ============================================================ */}
      <div className="famicash-main-area">
        {/* Header móvil compacto */}
        <header className="mobile-top-navbar">
          <div className="mobile-brand-left" onClick={() => setVista('dashboard')}>
            <img src={logoFamicash} alt="FamiCash" className="mobile-logo-sm" />
          </div>
          <div className="mobile-actions-right">
            <button
              type="button"
              className="mobile-fullscreen-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              className="mobile-bell-btn"
              onClick={() => setMostrarAlertasTopes(true)}
              title="Alertas de topes"
            >
              <Bell size={19} />
              {alertasTopes.length > 0 && (
                <span className={`mobile-bell-dot ${tieneRojo ? 'rojo' : 'amarillo'}`}>
                  {alertasTopes.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileDrawerOpen(true)}
              title="Abrir menú"
              aria-label="Abrir menú"
            >
              <Menu size={21} />
            </button>
          </div>
        </header>

        {/* Barra global de Periodo (Mensual / Trimestral / Anual) */}
        {['dashboard', 'reports', 'movements', 'budgets'].includes(vista) && (
          <div className="sticky-period-bar">
            <BarraPeriodo
              periodoTipo={periodoTipo}
              setPeriodoTipo={setPeriodoTipo}
              periodoClave={periodoClave}
              setPeriodoClave={setPeriodoClave}
              onExportExcel={handleExportExcelActual}
              exporting={exportando}
              showFilterToggle={false}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        )}

        {/* Contenido dinámico de la vista seleccionada */}
        <main className="famicash-page-content">
          {vista === 'dashboard' && (
            <VistaDashboard
              usuario={usuario}
              resumen={resumen}
              filtros={filtros}
              periodoTipo={periodoTipo}
              periodoClave={periodoClave}
              presupuestosMensuales={presupuestosMensuales}
              onDrillCategoria={(catItem) => {
                setDrillInicial(catItem);
                setVista('reports');
              }}
              onGoToView={setVista}
            />
          )}

          {vista === 'register' && (
            <VistaRegistro
              taxonomia={taxonomia}
              mediosPago={mediosPago}
              favoritos={favoritos}
              preset={presetRegistro}
              editandoTx={editandoTx}
              presupuestosMensuales={presupuestosMensuales}
              onClearEdit={handleCancelarEdicion}
              onSaveTransaccion={handleSaveTransaccion}
              onToggleFavorito={handleToggleFavorito}
              onQuickCreateDetalle={handleQuickCreateDetalle}
              onRefreshCatalogos={cargarCatalogos}
            />
          )}

          {vista === 'reports' && (
            <VistaReportes
              taxonomia={taxonomia}
              mediosPago={mediosPago}
              periodoTipo={periodoTipo}
              periodoClave={periodoClave}
              filtros={filtros}
              setFiltros={setFiltros}
              drillInicial={drillInicial}
              onClearDrillInicial={() => setDrillInicial(null)}
              onEditTransaccion={handleEditTransaccion}
              onDeleteTransaccion={handleSolicitarEliminarTx}
              onQuickAddTransaccion={handleSaveTransaccion}
              refreshKey={refreshKey}
            />
          )}

          {vista === 'movements' && (
            <VistaMovimientos
              periodoTipo={periodoTipo}
              periodoClave={periodoClave}
              filtros={filtros}
              setFiltros={setFiltros}
              drillInicial={drillInicial}
              onClearDrillInicial={() => setDrillInicial(null)}
              onEditTransaccion={handleEditTransaccion}
              onDeleteTransaccion={handleSolicitarEliminarTx}
              refreshKey={refreshKey}
            />
          )}

          {vista === 'budgets' && (
            <VistaPresupuestos
              taxonomia={taxonomia}
              periodoTipo={periodoTipo}
              periodoClave={periodoClave}
              refreshKey={refreshKey}
            />
          )}

          {vista === 'goals' && (
            <VistaObjetivos
              taxonomia={taxonomia}
              mediosPago={mediosPago}
              refreshKey={refreshKey}
              onRefreshGlobal={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {vista === 'settings' && (
            <VistaAdminTaxonomia
              taxonomia={taxonomia}
              mediosPago={mediosPago}
              onRefreshCatalogos={() => {
                cargarCatalogos();
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
        </main>

        {/* Barra de navegación inferior para Móvil (< 960px): 3 botones grandes */}
        <nav className="mobile-bottom-nav mobile-bottom-nav-3">
          {navItems
            .filter((item) => ['dashboard', 'register', 'reports'].includes(item.id))
            .map((item) => {
              const Icon = item.icon;
              const active = vista === item.id;
              const labelMovil = item.id === 'register' ? 'Ingreso' : item.label;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`mob-nav-btn-lg ${active ? 'active' : ''} ${item.highlight ? 'fab' : ''}`}
                  onClick={() => {
                    if (item.id !== 'register') setEditandoTx(null);
                    setVista(item.id);
                  }}
                >
                  <Icon size={22} />
                  <span>{labelMovil}</span>
                </button>
              );
            })}
        </nav>

        {/* Sidebar Drawer Lateral Móvil (Topes, Metas, Excel, Perfil, Salir) */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <motion.div
              className="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileDrawerOpen(false)}
            >
              <motion.aside
                className="mobile-drawer-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mobile-drawer-header">
                  <img src={logoFamicash} alt="FamiCash" className="mobile-logo-sm" />
                  <button
                    type="button"
                    className="tx-icon-btn"
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-label="Cerrar menú"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mobile-drawer-nav">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = vista === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`sidebar-link ${active ? 'active' : ''}`}
                        onClick={() => {
                          if (item.id !== 'register') setEditandoTx(null);
                          setVista(item.id);
                          setMobileDrawerOpen(false);
                        }}
                      >
                        <Icon size={19} />
                        <div className="sidebar-link-texts">
                          <span>{item.label}</span>
                          <small>{item.sub}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mobile-drawer-footer">
                  <button
                    type="button"
                    className="btn-sidebar-excel"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      handleExportExcelActual();
                    }}
                    disabled={exportando}
                  >
                    <Download size={16} />
                    <span>{exportando ? 'Exportando...' : 'Exportar a Excel'}</span>
                  </button>

                  <div className="user-profile-pill">
                    <button
                      type="button"
                      className="user-profile-edit-trigger"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        abrirModalPerfil();
                      }}
                    >
                      <div className="user-avatar-circle">
                        {(usuario.nombre || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="user-meta-text">
                        <strong>{usuario.nombre}</strong>
                        <small>{usuario.email}</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-logout-icon"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        handleLogout();
                      }}
                      title="Cerrar sesión"
                    >
                      <LogOut size={17} />
                    </button>
                  </div>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          POPUP DE ALERTAS DE TOPES MENSUALES (CAMPANITA)
          ============================================================ */}
      <AnimatePresence>
        {mostrarAlertasTopes && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMostrarAlertasTopes(false)}
          >
            <motion.div
              className="modal-dialog-card alerts-modal-card"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-dialog-header">
                <div className="alerts-modal-title-wrap">
                  <Bell size={19} className={tieneRojo ? 'text-rose' : 'text-amber'} />
                  <div>
                    <h3>Alertas de Topes Mensuales</h3>
                    <p className="text-muted-sm">
                      {alertasTopes.length > 0
                        ? `${alertasTopes.length} ${alertasTopes.length === 1 ? 'tope requiere' : 'topes requieren'} tu atención este mes`
                        : 'Todos tus topes están dentro del límite'}
                    </p>
                  </div>
                </div>
                <button type="button" className="tx-icon-btn" onClick={() => setMostrarAlertasTopes(false)}>
                  <X size={18} />
                </button>
              </div>

              {alertasTopes.length === 0 ? (
                <div className="empty-state-box">
                  ¡Excelente! No hay topes mensuales cerca de superarse o excedidos.
                </div>
              ) : (
                <div className="alerts-topes-list">
                  {alertasTopes.map((al) => {
                    const esRojo = al.estado === 'ROJO';
                    const nombre = al.subcategoria
                      ? `${nombreCategoria(al.categoria)} › ${nombreSubcategoria(al.subcategoria)}`
                      : nombreCategoria(al.categoria);
                    const ancho = Math.min(al.pct || 0, 100);
                    return (
                      <div key={al.id} className={`alert-tope-item ${esRojo ? 'rojo' : 'amarillo'}`}>
                        <div className="ati-head">
                          <strong>{nombre}</strong>
                          <span className={`ati-badge ${esRojo ? 'rojo' : 'amarillo'}`}>
                            {esRojo ? `Excedido ${al.pct}%` : `Casi al límite ${al.pct}%`}
                          </span>
                        </div>
                        <div className="ati-progress-track">
                          <div
                            className={`ati-progress-fill ${esRojo ? 'rojo' : 'amarillo'}`}
                            style={{ width: `${ancho}%` }}
                          />
                        </div>
                        <div className="ati-foot">
                          <span>Gastado: <strong>{formatSoles(al.real)}</strong> / {formatSoles(al.presupuesto)}</span>
                          <span>
                            {al.disponible < 0
                              ? `Excedido por ${formatSoles(Math.abs(al.disponible))}`
                              : `Quedan ${formatSoles(al.disponible)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="modal-dialog-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setMostrarAlertasTopes(false)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn-primary-inline"
                  onClick={() => {
                    setMostrarAlertasTopes(false);
                    setVista('budgets');
                  }}
                >
                  <span>Ir a Topes →</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          POPUP GLOBAL DE CONFIRMACIÓN PARA ELIMINAR MOVIMIENTO
          ============================================================ */}
      {txAEliminar && (
        <div className="modal-backdrop" onClick={() => setTxAEliminar(null)}>
          <div className="modal-dialog-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <AlertTriangle size={28} />
            </div>
            <h3>¿Eliminar este movimiento?</h3>
            <p className="confirm-modal-desc">
              {txAEliminar.monto
                ? `${txAEliminar.detalle || nombreSubcategoria(txAEliminar.subcategoria) || 'Registro'} por ${formatSoles(txAEliminar.monto)}`
                : 'Se eliminará este registro y se actualizará el balance del periodo.'}
            </p>
            <div className="modal-dialog-footer">
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setTxAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={handleConfirmarEliminarTx}
                disabled={eliminandoTx}
              >
                <Trash2 size={16} />
                <span>{eliminandoTx ? 'Eliminando...' : 'Sí, eliminar movimiento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          POPUP DE EDICIÓN DE PERFIL DE USUARIO
          ============================================================ */}
      {modalPerfil && (
        <div className="modal-backdrop" onClick={() => setModalPerfil(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog-header">
              <div>
                <h3>Mi Perfil Familiar</h3>
                <p className="text-muted-sm">{usuario.email}</p>
              </div>
              <button type="button" className="tx-icon-btn" onClick={() => setModalPerfil(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleGuardarPerfil} className="modal-form-grid">
              <div className="field-group">
                <label>Tu nombre</label>
                <input
                  type="text"
                  required
                  value={formPerfil.nombre}
                  onChange={(e) => setFormPerfil({ ...formPerfil, nombre: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label>Contraseña actual (solo si deseas cambiarla)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para mantener actual"
                  value={formPerfil.passwordActual}
                  onChange={(e) => setFormPerfil({ ...formPerfil, passwordActual: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label>Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formPerfil.passwordNueva}
                  onChange={(e) => setFormPerfil({ ...formPerfil, passwordNueva: e.target.value })}
                />
              </div>
              <div className="modal-dialog-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setModalPerfil(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-inline" disabled={guardandoPerfil}>
                  <CheckCircle2 size={16} />
                  <span>{guardandoPerfil ? 'Guardando...' : 'Guardar Perfil'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
