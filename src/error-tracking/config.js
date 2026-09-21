/** @type {{ dsn: string, environment: string }} */
export const SENTRY_CONFIG = {
  // Bastian: Sentry-Projekt anlegen (sentry.io oder self-hosted) und DSN hier eintragen
  // (TODO.md, B-11). Ein DSN ist KEIN Geheimnis -- er erlaubt nur, Events zu *senden*,
  // niemals bestehende Daten zu *lesen*. Deshalb darf er wie der Supabase-Publishable-
  // Key (siehe src/ranking/config.js) im Client-Code stehen (CLAUDE.md Regel 2).
  //
  // Solange dieses Feld leer ist, bleibt Error-Tracking komplett inaktiv: kein
  // Sentry.init()-Aufruf, kein Netzwerkzugriff, kein Fehlerfall.
  dsn: '',
  environment: 'production',
};
