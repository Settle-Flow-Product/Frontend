import 'server-only';

import { query } from './db';

/**
 * The dashboard's queries.
 *
 * These are the questions an operator opens the console to ask, and they are **computed**, not
 * browsed — which is why they live here rather than falling out of the generic table module.
 *
 * Every one of them is read-only. The dashboard writes nothing.
 */

export interface Health {
  requests_total: string;
  requests_pending: string;
  requests_approved: string;
  requests_paid: string;
  requests_cancelled: string;
  settlements_in_flight: string;
  chain_events: string;
  quarantined: string;
  cursor: string | null;
}

export async function health(): Promise<Health> {
  const rows = await query<Health>(
    `
    SELECT
      (SELECT count(*)::text FROM payment_requests)                                    AS requests_total,
      (SELECT count(*)::text FROM payment_requests WHERE status = 'pending')           AS requests_pending,
      (SELECT count(*)::text FROM payment_requests WHERE status = 'approved')          AS requests_approved,
      (SELECT count(*)::text FROM payment_requests WHERE status = 'paid')              AS requests_paid,
      (SELECT count(*)::text FROM payment_requests WHERE status = 'cancelled')         AS requests_cancelled,
      (SELECT count(*)::text FROM settlements
         WHERE status IN ('awaiting_approval','releasing','unresolved'))               AS settlements_in_flight,
      (SELECT count(*)::text FROM chain_events)                                        AS chain_events,
      (SELECT count(*)::text FROM chain_events WHERE quarantined)                      AS quarantined,
      (SELECT ledger_seq::text FROM ingest_cursor LIMIT 1)                             AS cursor
    `,
  );
  return (
    rows[0] ?? {
      requests_total: '0',
      requests_pending: '0',
      requests_approved: '0',
      requests_paid: '0',
      requests_cancelled: '0',
      settlements_in_flight: '0',
      chain_events: '0',
      quarantined: '0',
      cursor: null,
    }
  );
}

export interface AttentionRow {
  kind: string;
  detail: string;
  since: string | null;
  severity: 'high' | 'medium';
}

/**
 * What an operator should look at, and why.
 *
 * Each row is a condition somebody has to resolve, not a statistic. A dashboard that shows only
 * counts tells you the system is busy; this tells you what is stuck.
 */
export async function needsAttention(): Promise<AttentionRow[]> {
  const rows = await query<AttentionRow>(
    `
    -- A settlement whose outcome we do not know. Nothing leaves this state except a readback, and
    -- it holds the treasury's sequence while it sits here.
    SELECT 'unresolved settlement'                       AS kind,
           'settlement ' || id::text                     AS detail,
           to_char(created_at, 'YYYY-MM-DD HH24:MI')     AS since,
           'high'                                        AS severity
    FROM settlements WHERE status = 'unresolved'

    UNION ALL

    -- Submitted, but no transaction hash came back. The same situation, seen from the other side.
    SELECT 'submitted, outcome unknown',
           'settlement ' || id::text,
           to_char(submit_attempted_at, 'YYYY-MM-DD HH24:MI'),
           'high'
    FROM settlements
    WHERE status = 'releasing' AND submit_attempted_at IS NOT NULL AND tx_hash IS NULL

    UNION ALL

    -- An event the indexer did not recognise. Never dropped, so it waits here.
    SELECT 'quarantined chain event',
           topic || ' in ' || tx_hash,
           to_char(ledger_time, 'YYYY-MM-DD HH24:MI'),
           'high'
    FROM chain_events WHERE quarantined

    UNION ALL

    -- Approved and unpaid past its own expiry: the window closed while it was waiting.
    SELECT 'approved but expired',
           reference,
           to_char(expiry_at, 'YYYY-MM-DD HH24:MI'),
           'medium'
    FROM payment_requests
    WHERE status = 'approved' AND expiry_at <= now()

    ORDER BY 4, 3 DESC
    LIMIT 100
    `,
  );
  return rows;
}

export interface RequestRow {
  id: string;
  reference: string;
  payee_address: string;
  amount: string;
  asset_code: string;
  status: string;
  created_at: string;
  collected: string | null;
  required: string | null;
}

/** Recent payments, with their signature progress. The one join worth having on a dashboard. */
export async function recentRequests(limit = 20): Promise<RequestRow[]> {
  return query<RequestRow>(
    `
    SELECT encode(r.id, 'hex')                       AS id,
           r.reference,
           r.payee_address,
           r.amount::text                            AS amount,
           r.asset_code,
           r.status::text                            AS status,
           to_char(r.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
           s.collected_weight::text                  AS collected,
           s.required_weight::text                   AS required
    FROM payment_requests r
    LEFT JOIN LATERAL (
        SELECT collected_weight, required_weight
        FROM settlements WHERE request_id = r.id
        ORDER BY created_at DESC LIMIT 1
    ) s ON true
    ORDER BY r.created_at DESC
    LIMIT $1
    `,
    [limit],
  );
}
