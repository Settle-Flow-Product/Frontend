#!/usr/bin/env node
/**
 * Manage console accounts from the command line.
 *
 * There is no sign-up page and no bootstrap-by-environment-variable, because both are ways for an
 * account to exist that nobody decided to create. Somebody with database access makes the first
 * one, deliberately.
 *
 *   npm run admin-user -- create ops@example.com operator
 *   ADMIN_PASSWORD=… npm run admin-user -- create ops@example.com operator   (non-interactive)
 *   npm run admin-user -- list
 *   npm run admin-user -- passwd ops@example.com
 *   npm run admin-user -- roles ops@example.com superadmin
 *   npm run admin-user -- disable ops@example.com
 */

import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import pg from 'pg';

const scrypt = promisify(scryptCallback);
const ROLES = ['superadmin', 'admin', 'operator', 'viewer'];

async function hash(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function connect() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  return new pg.Pool({ connectionString, max: 2 });
}

async function askPassword() {
  // A non-interactive way in, for a first account created by a provisioning script or a fresh
  // environment being rebuilt. The prompt below needs a real terminal — piping into it hangs
  // forever, which makes the only documented way to create the first account impossible to
  // automate.
  //
  // Still no bootstrap-by-environment-variable at STARTUP: the account is created because somebody
  // ran this command, which is the property that matters. This only changes where the password is
  // typed.
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) {
    checkLength(fromEnv);
    return fromEnv;
  }

  if (!process.stdin.isTTY) {
    console.error('no terminal to prompt on. Set ADMIN_PASSWORD, or run this from a shell.');
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question('password: ');
  const b = await rl.question('again: ');
  rl.close();
  if (a !== b) {
    console.error('they did not match');
    process.exit(1);
  }
  checkLength(a);
  return a;
}

/**
 * The length rule, and the one way past it.
 *
 * Twelve characters because this account can read every payment the business has ever made. That
 * stays the default everywhere.
 *
 * `ALLOW_WEAK_PASSWORD=1` exists for seeding a local testnet demo, where the database is wiped
 * several times an hour and a strong password is a strong password for nobody. It has to be typed
 * deliberately, and it says what it is — which is the difference between a decision and an
 * accident. Nothing in the deployment sets it.
 */
function checkLength(password) {
  if (password.length >= 12) return;
  if (process.env.ALLOW_WEAK_PASSWORD === '1') {
    console.warn('! weak password accepted because ALLOW_WEAK_PASSWORD=1 — local demo only');
    return;
  }
  console.error('use at least 12 characters — this account can read every payment');
  console.error('for a local demo seed: ALLOW_WEAK_PASSWORD=1');
  process.exit(1);
}

function rolesFrom(args) {
  const given = args.filter((a) => ROLES.includes(a));
  if (given.length === 0) return ['viewer'];
  return given;
}

const [command, ...rest] = process.argv.slice(2);
const pool = connect();

try {
  switch (command) {
    case 'create': {
      const email = rest[0];
      if (!email) throw new Error('usage: create <email> [roles…]');
      const roles = rolesFrom(rest.slice(1));
      const password = await askPassword();
      const { rows } = await pool.query(
        'INSERT INTO admin_users (email, password_hash, roles) VALUES ($1, $2, $3) RETURNING id',
        [email, await hash(password), roles],
      );
      console.log(`created ${email} (${roles.join(', ')}) — ${rows[0].id}`);
      break;
    }

    case 'list': {
      const { rows } = await pool.query(
        'SELECT email, roles, active, token_epoch FROM admin_users ORDER BY email',
      );
      if (rows.length === 0) console.log('no accounts yet — run: npm run admin-user -- create <email>');
      for (const r of rows) {
        console.log(
          `${r.active ? ' ' : '✗'} ${r.email.padEnd(32)} ${r.roles.join(',').padEnd(24)} epoch ${r.token_epoch}`,
        );
      }
      break;
    }

    case 'passwd': {
      const email = rest[0];
      if (!email) throw new Error('usage: passwd <email>');
      const password = await askPassword();
      // Bumping the epoch signs their existing sessions out. Changing a password and leaving old
      // tokens working is not changing a password.
      const { rowCount } = await pool.query(
        'UPDATE admin_users SET password_hash = $2, token_epoch = token_epoch + 1, updated_at = now() WHERE lower(email) = lower($1)',
        [email, await hash(password)],
      );
      console.log(rowCount === 1 ? `changed, and signed out existing sessions` : 'no such account');
      break;
    }

    case 'roles': {
      const email = rest[0];
      if (!email) throw new Error('usage: roles <email> <role…>');
      const roles = rolesFrom(rest.slice(1));
      const { rowCount } = await pool.query(
        'UPDATE admin_users SET roles = $2, token_epoch = token_epoch + 1, updated_at = now() WHERE lower(email) = lower($1)',
        [email, roles],
      );
      console.log(rowCount === 1 ? `now ${roles.join(', ')}, and signed out` : 'no such account');
      break;
    }

    case 'disable': {
      const email = rest[0];
      if (!email) throw new Error('usage: disable <email>');
      const { rowCount } = await pool.query(
        'UPDATE admin_users SET active = false, token_epoch = token_epoch + 1, updated_at = now() WHERE lower(email) = lower($1)',
        [email],
      );
      console.log(rowCount === 1 ? 'disabled, and signed out at once' : 'no such account');
      break;
    }

    default:
      console.log('commands: create · list · passwd · roles · disable');
      process.exit(command ? 1 : 0);
  }
} catch (e) {
  console.error(String(e instanceof Error ? e.message : e));
  process.exitCode = 1;
} finally {
  await pool.end();
}
