/* ════════════════════════════════════════════════════════════════════
   PNG PACIFIC CAPITAL — Supabase auth adapter  (SCAFFOLD — not yet wired)
   Addresses findings #1 (real auth) and #5 (server-side data).

   This file is NOT loaded by index.html yet, so the live app is unchanged.
   To activate, follow backend/README.md. It is intentionally self-contained
   and inert until you provide SUPABASE_URL + SUPABASE_ANON_KEY below.
   ════════════════════════════════════════════════════════════════════ */
'use strict';

// 1. Fill these in from Supabase → Project Settings → API.
//    The anon key is SAFE to ship to the browser: it grants nothing on its
//    own — Row-Level Security (schema.sql) decides what each logged-in user
//    can actually see or change. (Never put the SERVICE_ROLE key here.)
const SUPABASE_URL = '';       // e.g. 'https://abcd.supabase.co'
const SUPABASE_ANON_KEY = '';  // e.g. 'eyJhbGci...'

const Backend = {
  enabled: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
  client: null,
  profile: null,

  /* Lazily create the Supabase client (loaded via CDN in index.html). */
  init() {
    if (!this.enabled) return false;
    if (!window.supabase) { console.error('Supabase JS not loaded'); return false; }
    this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return true;
  },

  /* Replaces the client-side PIN check with real server auth. */
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) { await this.logLogin(email, 'Failed'); throw error; }
    await this.loadProfile();
    await this.logLogin(this.profile?.full_name || email, 'Success');
    await this.log('Signed in');
    return data.user;
  },

  async signOut() { await this.log('Signed out'); await this.client.auth.signOut(); this.profile = null; },

  async currentUser() { const { data } = await this.client.auth.getUser(); return data.user; },

  async loadProfile() {
    const { data } = await this.client.from('profiles').select('*').single();
    this.profile = data; return data;
  },

  /* Role helper for hiding UI a user cannot use. The DB enforces the real
     rules via RLS regardless of what the UI shows. */
  hasRole(...roles) { return this.profile && roles.includes(this.profile.role); },
  canWriteFinance() { return this.hasRole('Managing Director', 'Finance Manager'); },

  /* Append-only audit log (DB blocks edits/deletes — see schema.sql). */
  async log(action) {
    if (!this.enabled) return;
    await this.client.from('audit_log').insert({ action, actor_name: this.profile?.full_name || null });
  },
  async logLogin(name, result) {
    if (!this.enabled) return;
    await this.client.from('login_history').insert({ actor_name: name, result });
  },

  /* Generic data helpers — replace the localStorage DB.* arrays.
     RLS ensures a tampered client still cannot read/write what it shouldn't. */
  async list(table) { const { data, error } = await this.client.from(table).select('*'); if (error) throw error; return data; },
  async insert(table, row) { const { data, error } = await this.client.from(table).insert(row).select().single(); if (error) throw error; return data; },
  async update(table, id, patch, idCol = 'id') { const { error } = await this.client.from(table).update(patch).eq(idCol, id); if (error) throw error; },
};

window.Backend = Backend;
