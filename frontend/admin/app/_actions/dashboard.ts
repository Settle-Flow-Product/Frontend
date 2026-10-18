'use server';

import { health, needsAttention, recentRequests } from '@/lib/ops';
import { currentCaller } from '@/lib/session';

/**
 * The dashboard's data.
 *
 * **The dashboard writes nothing.** Every function here reads, and the permission it asks for is
 * `read` — an operations screen that can change the money path is a much larger thing than a
 * screen that shows it.
 */
async function requireReader() {
  const who = await currentCaller();
  if (who === null || !who.grants.read) throw new Error('sign in to use the console');
}

export async function dashboardHealth() {
  await requireReader();
  return health();
}

export async function dashboardAttention() {
  await requireReader();
  return needsAttention();
}

export async function dashboardRecent() {
  await requireReader();
  return recentRequests();
}
