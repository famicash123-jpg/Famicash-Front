// ============================================================
// Vista: Últimos Movimientos (Cola cronológica simple + Modal de detalle y adjunto)
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Trash2,
  ListOrdered,
  Paperclip,
  ExternalLink,
  X,
  FileText,
  Calendar,
  CreditCard,
  User,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import {
  formatSoles,
  formatFechaCorta,
  getMetaCategoria,
  nombreCategoria,
  nombreSubcategoria,
  nombreMedioPago
} from '../utils/format';
import { CategoriaIcon, SubcategoriaIcon, MedioPagoIcon } from './IconoFamicash';

export default function VistaMovimientos({
  periodoTipo,
  periodoClave,
  filtros,
  onEditTransaccion,
  onDeleteTransaccion,
  refreshKey
}) {
  const [txData, setTxData] = useState({ items: [], total: 0, totales: {} });
  const [cargando, setCargando] = useState(true);
  const [txSeleccionada, setTxSeleccionada] = useState(null);
  const [adjuntoDetalle, setAdjuntoDetalle] = useState(null);
  const [cargandoAdjunto, setCargandoAdjunto] = useState(false);

  const cargarMovimientos = useCallback(async () => {
    setCargando(true);
    try {
      // Obtenemos las fechas exactas del periodo seleccionado y luego los movimientos en orden descendente
      const res = await api.getResumen({
        ...filtros,
        periodoTipo,
        periodo: periodoClave
      });
      const resTx = await api.getTransacciones({
        ...filtros,
        desde: res?.periodo?.desde,
        hasta: res?.periodo?.hasta,
        limite: 300
      });
      setTxData(resTx || { items: [], total: 0, totales: {} });
    } catch (err) {
      console.error('Error cargando últimos movimientos:', err);
    } finally {
      setCargando(false);
    }
  }, [periodoTipo, periodoClave, filtros, refreshKey]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  const abrirDetalle = async (tx) => {
    setTxSeleccionada(tx);
    setAdjuntoDetalle(null);

    if (tx.adjuntoUrl) {
      setAdjuntoDetalle({
        url: tx.adjuntoUrl,
        nombre: tx.adjuntoNombre || 'Comprobante adjunto',
        tipo: tx.adjuntoTipo || ''
      });
      return;
    }

    if (tx.tieneAdjunto) {
      setCargandoAdjunto(true);
      try {
        const res = await api.getAdjuntoTransaccion(tx.id);
        const url = res?.adjuntoUrl || res?.adjuntoData;
        if (url) {
          setAdjuntoDetalle({
            url,
            nombre: res.adjuntoNombre || tx.adjuntoNombre || 'Comprobante adjunto',
            tipo: res.adjuntoTipo || tx.adjuntoTipo || ''
          });
        }
      } catch (err) {
        console.error('Error cargando adjunto:', err);
      } finally {
        setCargandoAdjunto(false);
      }
    }
  };

  return (
    <motion.div
      className="movimientos-simple-shell"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="panel-card">
        <div className="panel-card-header wrap-header">
          <div>
            <div className="section-title-with-icon">
              <ListOrdered size={20} className="icon-forest" />
              <h3>Últimos Movimientos ({txData.total || 0})</h3>
            </div>
            <p>Ordenado del más reciente al más antiguo · Toca cualquiera para ver su detalle y archivo</p>
          </div>
        </div>

        {cargando ? (
          <div className="empty-state-box">Cargando movimientos...</div>
        ) : txData.items?.length === 0 ? (
          <div className="empty-state-box">No hay movimientos registrados en este periodo.</div>
        ) : (
          <div className="tx-compact-list mov-queue-list">
            {txData.items.map((tx) => {
              const meta = getMetaCategoria(tx.categoria);
              const tieneArchivo = Boolean(tx.tieneAdjunto || tx.adjuntoUrl);
              return (
                <button
                  key={tx.id}
                  type="button"
                  className="tx-row-item mov-queue-row"
                  onClick={() => abrirDetalle(tx)}
                >
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
                      {tieneArchivo && (
                        <span className="mov-has-file-badge" title="Tiene foto o PDF adjunto">
                          <Paperclip size={12} />
                        </span>
                      )}
                    </div>
                    <div className="tx-sub-line">
                      <span>{nombreCategoria(tx.categoria)}</span>
                      <span>›</span>
                      <span>{nombreSubcategoria(tx.subcategoria)}</span>
                      {tx.medioPago && (
                        <>
                          <span>·</span>
                          <span>{nombreMedioPago(tx.medioPago)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mov-queue-right">
                    <span className={`tx-amount-val ${tx.tipo.toLowerCase()}`}>
                      {tx.tipo === 'GASTO' ? '-' : '+'}
                      {formatSoles(tx.monto)}
                    </span>
                    <ChevronRight size={16} className="legend-chevron" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalle + Archivo/Foto (Cloudinary) */}
      <AnimatePresence>
        {txSeleccionada && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTxSeleccionada(null)}
          >
            <motion.div
              className="modal-dialog-card adjunto-lightbox-card"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-dialog-header">
                <div className="alerts-modal-title-wrap">
                  <CategoriaIcon codigo={txSeleccionada.categoria} size={20} withBadge />
                  <div>
                    <h3>{txSeleccionada.detalle || nombreSubcategoria(txSeleccionada.subcategoria)}</h3>
                    <p className="text-muted-sm">
                      {nombreCategoria(txSeleccionada.categoria)} › {nombreSubcategoria(txSeleccionada.subcategoria)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="tx-icon-btn"
                  onClick={() => setTxSeleccionada(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mov-detail-amount-banner">
                <span className={`tx-amount-val big ${txSeleccionada.tipo.toLowerCase()}`}>
                  {txSeleccionada.tipo === 'GASTO' ? '-' : '+'}
                  {formatSoles(txSeleccionada.monto)}
                </span>
                <span className="mov-detail-type-pill">{txSeleccionada.tipo}</span>
              </div>

              <div className="mov-detail-grid">
                <div className="mov-detail-item">
                  <Calendar size={15} />
                  <span>Fecha: <strong>{txSeleccionada.fecha}</strong></span>
                </div>
                {txSeleccionada.medioPago && (
                  <div className="mov-detail-item">
                    <CreditCard size={15} />
                    <span>Medio: <strong>{nombreMedioPago(txSeleccionada.medioPago)}</strong></span>
                  </div>
                )}
                <div className="mov-detail-item">
                  <User size={15} />
                  <span>Persona: <strong>{txSeleccionada.persona}</strong></span>
                </div>
                {txSeleccionada.observaciones && (
                  <div className="mov-detail-item full">
                    <MessageSquare size={15} />
                    <span>Nota: <strong>“{txSeleccionada.observaciones}”</strong></span>
                  </div>
                )}
              </div>

              {/* Visor de foto / PDF si tiene adjunto */}
              {(txSeleccionada.tieneAdjunto || txSeleccionada.adjuntoUrl) && (
                <div className="mov-detail-attachment-box">
                  <div className="mda-title">
                    <Paperclip size={14} />
                    <span>{adjuntoDetalle?.nombre || txSeleccionada.adjuntoNombre || 'Archivo adjunto'}</span>
                  </div>
                  {cargandoAdjunto ? (
                    <div className="empty-state-box">Cargando archivo...</div>
                  ) : adjuntoDetalle?.url ? (
                    <div className="adjunto-preview-body">
                      {adjuntoDetalle.tipo === 'application/pdf' ||
                      String(adjuntoDetalle.url).toLowerCase().includes('.pdf') ? (
                        <div className="adjunto-pdf-wrap">
                          <FileText size={32} className="icon-forest" />
                          <iframe
                            src={adjuntoDetalle.url}
                            title={adjuntoDetalle.nombre}
                            className="adjunto-preview-pdf"
                          />
                        </div>
                      ) : (
                        <img
                          src={adjuntoDetalle.url}
                          alt={adjuntoDetalle.nombre}
                          className="adjunto-preview-img"
                        />
                      )}
                    </div>
                  ) : null}
                  {adjuntoDetalle?.url && (
                    <a
                      href={adjuntoDetalle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-view-adjunto"
                    >
                      <ExternalLink size={13} />
                      <span>Abrir archivo en nueva pestaña</span>
                    </a>
                  )}
                </div>
              )}

              <div className="modal-dialog-footer">
                <button
                  type="button"
                  className="btn-danger-confirm"
                  onClick={() => {
                    const id = txSeleccionada.id;
                    setTxSeleccionada(null);
                    onDeleteTransaccion(id);
                  }}
                >
                  <Trash2 size={15} />
                  <span>Eliminar</span>
                </button>
                <button
                  type="button"
                  className="btn-primary-inline"
                  onClick={() => {
                    const tx = txSeleccionada;
                    setTxSeleccionada(null);
                    onEditTransaccion(tx);
                  }}
                >
                  <Pencil size={15} />
                  <span>Editar</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
