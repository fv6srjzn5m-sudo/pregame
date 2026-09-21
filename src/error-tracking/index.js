import * as Sentry from '@sentry/browser';
import { SENTRY_CONFIG } from './config.js';

/* Fehler-Tracking fuer den Livebetrieb (Audit-Runde 2, Fund A-13). Grund: mehrere Funde
   dieser Audit-Runde waren Fehler, die still falsch laufen (falsche Punkte, fehlende
   Bestaetigungen) -- ohne Error-Tracking wuerde das im Livebetrieb niemand bemerken
   (AUDIT-2.md/INFRASTRUCTURE.md, groesste bisher fehlende Infrastruktur-Komponente).

   PII-Filterung ist von Anfang an eingebaut (CLAUDE.md-Vorgabe, "nicht nachtraeglich"):
   - user/request werden nie gesetzt und vorsorglich zusaetzlich entfernt.
   - Klick-/Eingabe-Breadcrumbs (koennten z.B. den gerade eingetippten Spielernamen
     enthalten) werden auf Kategorie/Zeitpunkt gekuerzt, Inhalt/Wert entfernt.
   - Keine Session-Replay/Performance-Traces (tracesSampleRate: 0) -- sammelt nur das
     Noetigste fuer Fehlerdiagnose, nicht mehr (Datenminimierung, CLAUDE.md Regel 6). */

function scrubBreadcrumb(breadcrumb) {
  if (breadcrumb.category === 'ui.click' || breadcrumb.category === 'ui.input') {
    delete breadcrumb.message;
    if (breadcrumb.data) delete breadcrumb.data.value;
  }
  return breadcrumb;
}

function scrubEvent(event) {
  delete event.user;
  delete event.request;
  return event;
}

export function initErrorTracking() {
  if (!SENTRY_CONFIG.dsn) return; // nicht konfiguriert -> bewusst inaktiv, kein Netzwerkzugriff

  // Absichtlich KEIN "integrations: []" -- das wuerde auch die Standard-Integration
  // abschalten, die ueberhaupt erst unbehandelte Fehler/Promise-Rejections automatisch
  // einfaengt (GlobalHandlers), und damit das Feature nutzlos machen. Die Standard-
  // Integrationen bleiben aktiv, PII-Filterung passiert stattdessen ueber beforeSend/
  // beforeBreadcrumb -- das ist der von Sentry selbst empfohlene Weg dafuer.
  Sentry.init({
    dsn: SENTRY_CONFIG.dsn,
    environment: SENTRY_CONFIG.environment,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

initErrorTracking();
