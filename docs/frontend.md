# Smriti Caregiver Web App — Complete Frontend Architecture

**Stack:** React 19 + Vite + TypeScript
**Scope:** Structure, data flow, wiring, state. No visual design — that comes from elsewhere.
**Backend status:** Live and tested. Schema (0001–0015), RLS (table + view level, isolation verified), pairing (3 paths), escalation with a confirmed real phone call, watchdog. You are building the client for a working server, not guessing at a spec.

---

## 0. What's real right now vs. what's pending

Build against this honestly — don't wire to things that don't exist yet.

| Piece | Status | Can build against it now? |
|---|---|---|
| `patients`, `patient_members`, all content tables | Live | Yes |
| RLS (caregiver/family_viewer/device roles) | Live, tested | Yes |
| `create_patient`, `get_patient_content`, `device_heartbeat`, `my_patients_overview`, `invite_member` RPCs | Live | Yes |
| `create-pairing-token`, `redeem-pairing-token`, `pair-device-authenticated` | Live, tested | Yes |
| `escalation-worker`, `twilio-webhook`, `watchdog` | Live, tested | Yes (you trigger indirectly, never call these directly) |
| `daily_report` and related views | Live | Yes |
| `ocr-prescription` Edge Function | **Not built** | Build UI now, wire later — see §9 |
| `generate-report` Edge Function | **Not built** | Build UI now, wire later — see §10 |
| Bandit (reminder-time optimization) | **Not built** | No UI dependency — invisible to you |
| Deep report views (savings scores, per-person trajectories, sundowning) | **Not built** (ML engineer's file) | Basic `daily_report` works now; richer report page waits |

---

## 1. Project structure

```
web/src/
  lib/
    db.ts                    # THE ONLY file importing @supabase/supabase-js
    supabase.ts              # client init only
    queryClient.ts           # TanStack Query config
  
  auth/
    AuthProvider.tsx          # session context, current user
    useAuth.ts
  
  patients/
    PatientContext.tsx        # current patient in scope, from URL
    usePatientAccess.ts        # role for current patient
  
  routes/
    router.tsx                 # all route definitions
    ProtectedRoute.tsx
    PatientRoute.tsx            # validates patient param, loads role
  
  pages/
    auth/
      SignIn.tsx
    patients/
      Overview.tsx              # multi-patient landing
      CreatePatient.tsx
    dashboard/
      Dashboard.tsx
    trends/
      Trends.tsx
    report/
      Report.tsx
    engagement/
      Engagement.tsx
    messages/
      Messages.tsx
    manage/
      People.tsx
      Medicines.tsx
      Routine.tsx
      Alerts.tsx
      Access.tsx
      Device.tsx
    care-guide/
      CareGuide.tsx
  
  features/
    people/
      usePeople.ts
      PersonForm.tsx
    medicines/
      useMedicines.ts
      MedicineForm.tsx
      useOcrPrescription.ts
    routine/
      useRoutine.ts
    escalation/
      useEscalationConfig.ts
    flags/
      useFlags.ts
    memos/
      useMemos.ts
    reports/
      useGenerateReport.ts
    access/
      useMembers.ts
    pairing/
      usePairingToken.ts
      PairingQr.tsx
      PairingCode.tsx
    device/
      useDeviceStatus.ts
  
  hooks/
    useContentMutation.ts       # THE choke point for all content writes
    useMediaUpload.ts
  
  types/
    (imports from packages/shared — do not redefine)
```

**Hard rule, mirrored from the backend spec:** no file outside `lib/` imports `@supabase/supabase-js`. Every other file calls exported functions from `lib/db.ts`. This is what makes it possible to audit every query the app makes in one place, and it's the same discipline that made the backend and tablet architecture work.

---

## 2. Routing — the shape

```
/                          → redirect based on patient count (see §4)
/auth                      → phone + OTP sign in
/patients                  → overview, ONLY rendered if caregiver has >1 patient
/patients/new              → create patient + setup wizard entry

/p/:patientId/dashboard    → default landing for a single patient
/p/:patientId/trends
/p/:patientId/report
/p/:patientId/engagement
/p/:patientId/messages
/p/:patientId/manage/people
/p/:patientId/manage/medicines
/p/:patientId/manage/routine
/p/:patientId/manage/alerts
/p/:patientId/manage/access
/p/:patientId/manage/device
/p/:patientId/care-guide
```

**The patient ID lives in the URL, always** — never only in component state or a global variable. This gives a working back button, bookmarkable pages, correct behavior on refresh, and it's the foundation of the cross-patient leakage guards in §12.

### Route guards

```
ProtectedRoute    → no session → redirect to /auth
PatientRoute      → wraps every /p/:patientId/* route
                  → on mount: verify caller is actually a member of :patientId
                    (RLS will already refuse the query, but check explicitly
                    so the UI can show "you don't have access" rather than
                    a blank/broken screen)
                  → loads and provides the caller's role for this patient
                    (caregiver | family_viewer) into context
                  → components read role from context to decide what's
                    editable vs read-only
```

---

## 3. Auth

Phone + OTP, Supabase Auth native flow. Nothing custom to build here beyond the UI.

```
signInWithOtp({ phone })
  → user receives SMS code
verifyOtp({ phone, token })
  → session established, SDK manages refresh automatically
```

After sign-in, always route through the patient-count redirect (§4) — never assume a specific patient.

**family_viewer accounts:** same sign-in flow. They just have fewer rows in `patient_members` with a different role value, and the UI adapts by role, not by a separate auth path.

---

## 4. The adaptive landing — real logic, not a design choice

```
On successful auth, call my_patients_overview()
  → 0 patients   → /patients/new
  → 1 patient    → /p/{that_id}/dashboard   (skip the overview entirely)
  → 2+ patients  → /patients
```

This isn't cosmetic — it's why most of your users (single-patient caregivers) never see multi-patient UI at all. Implement this redirect logic once, at the root route, and never duplicate it.

---

## 5. Data layer — the choke points

### `lib/db.ts` — every query path, nothing else touches Supabase

```typescript
// Reads
export const patientsOverview = () =>
  supabase.rpc('my_patients_overview');

export const patientContent = (pid: string) =>
  supabase.from('people').select('*').eq('patient_id', pid).order('sort_order');

export const medicationsFor = (pid: string) =>
  supabase.from('medications').select('*').eq('patient_id', pid).eq('active', true);

export const routineFor = (pid: string) =>
  supabase.from('routine_items').select('*').eq('patient_id', pid).order('time_min');

export const escalationConfigFor = (pid: string) =>
  supabase.from('escalation_config').select('*').eq('patient_id', pid).single();

export const dailyReportRange = (pid: string, fromDate: string) =>
  supabase.from('daily_report').select('*').eq('patient_id', pid).gte('day', fromDate);

export const activeFlags = (pid: string) =>
  supabase.from('flags').select('*').eq('patient_id', pid).eq('status', 'active')
    .order('created_at', { ascending: false });

export const memosFor = (pid: string) =>
  supabase.from('memos').select('*').eq('patient_id', pid)
    .order('recorded_at', { ascending: false }).limit(50);

export const membersFor = (pid: string) =>
  supabase.from('patient_members').select('*, users(*)').eq('patient_id', pid);

export const patientRow = (pid: string) =>
  supabase.from('patients').select('*').eq('id', pid).single();

// Writes — RPCs
export const createPatient = (args: CreatePatientArgs) =>
  supabase.rpc('create_patient', args);

export const inviteMember = (pid: string, phone: string, role: string) =>
  supabase.rpc('invite_member', { p_patient_id: pid, p_phone: phone, p_role: role });

export const createPairingToken = (pid: string) =>
  supabase.functions.invoke('create-pairing-token', { body: { patient_id: pid } });

export const acknowledgeFlag = (flagId: string) =>
  supabase.from('flags').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', flagId);

// NOTE: no export here queries `events`, `sessions`, or `reminder_events`
// directly. Deliberate. See §6.
```

**Why this matters practically:** when the ML engineer's deep report views land later, you add exports here and nowhere else changes. When RLS policy changes, this file is the single place to re-audit.

### The content-write choke point

Every mutation to `people`, `medications`, `routine_items`, `escalation_config` must go through one function, because the server-side trigger auto-bumps `content_version` on any write to these tables — but the *client* still needs a single consistent pattern for optimistic updates and cache invalidation.

```typescript
// hooks/useContentMutation.ts
export function useContentMutation<T>(
  table: 'people' | 'medications' | 'routine_items' | 'escalation_config',
  patientId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<T> & { id?: string }) =>
      payload.id
        ? supabase.from(table).update(payload).eq('id', payload.id)
        : supabase.from(table).insert({ ...payload, patient_id: patientId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, patientId] });
      qc.invalidateQueries({ queryKey: ['device-status', patientId] }); // content_version changed
    },
  });
}
```

No screen writes to a content table through a bespoke `supabase.from(...).update(...)` call. They all go through this hook.

---

## 6. Never query raw events — this is enforced, not a suggestion

The `events` table holds potentially tens of thousands of rows per patient. Every report/trend/dashboard screen reads from **views** (`daily_report`, `daily_play`, `daily_domain`, `daily_sessions`, `daily_adherence`), never from `events` or `sessions` directly.

This is already correct on the server — the views exist, they're `security_invoker`-safe, RLS applies through them properly. The frontend rule is simply: **don't add a raw `events` query to `lib/db.ts`**, ever, no matter how tempting for a "quick debug view." If you need a new aggregate, ask for a new view server-side.

---

## 7. TanStack Query — caching strategy by data type

| Data | Strategy | Reasoning |
|---|---|---|
| `patients`, `patient_members`, content tables | Live listener via `postgres_changes` | Changes rarely, but must reflect immediately when it does |
| `daily_report` / trend views | Cached, `staleTime: 5 * 60_000` | Historical, doesn't change once the day has passed |
| `flags` | Live listener | New flags must appear without a refresh |
| `memos` | Live listener | New voice messages should show up promptly |
| Device status (`device_last_seen_at`) | Live listener | "Last synced" needs to feel current |

### One realtime channel per patient, not one per widget

```typescript
// features/dashboard, on patient page mount
const channel = supabase
  .channel(`patient-${patientId}`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'patients', filter: `id=eq.${patientId}` },
      handlePatientUpdate)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'flags', filter: `patient_id=eq.${patientId}` },
      handleNewFlag)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'memos', filter: `patient_id=eq.${patientId}` },
      handleNewMemo)
  .subscribe();

// unsubscribe on unmount — mandatory, prevents accumulating channels
```

RLS applies to realtime payloads server-side, so this is safe even though the filter is patient-scoped client-side — a caregiver literally cannot receive another patient's row through this channel regardless of what filter string they construct.

### Multi-patient overview needs its own lighter subscription

```typescript
// pages/patients/Overview.tsx
supabase.channel('caregiver-feed')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, updateOverviewRow)
  .subscribe();
```

One subscription covers every patient the caller can see — RLS filters server-side, so no client-side per-patient filtering needed here.

---

## 8. Page-by-page: what each actually needs to fetch and do

### `/auth` — Sign In
- Phone input → `signInWithOtp`
- OTP input → `verifyOtp`
- On success → redirect logic from §4

### `/patients/new` — Create Patient + Setup Wizard
Multi-step, each step writes to a different table. State lives in a wizard context until final submit, or writes incrementally — pick incrementally, since a caregiver abandoning halfway shouldn't lose progress.

1. **Basic info** → `create_patient` RPC (name, age, education, language, timezone, primary contact) — this one call creates the patient row, the caregiver membership, and the default escalation config atomically
2. **People** → for each person: upload photo to `patient-media` bucket → confirm upload succeeded → insert row into `people` with the storage **path**, not a URL
3. **Voice recording** → `MediaRecorder` API → same upload pattern into `patient-media`
4. **Medicines** → either manual entry or OCR flow (see §9) → insert into `medications`
5. **Routine** → insert into `routine_items`
6. **Escalation contacts** → update `escalation_config`
7. **Pairing** → generate QR/code (see §11)

**Critical ordering rule, same as the tablet's content puller:** upload media and confirm it succeeded *before* writing the row that references its path. A `people` row pointing at a path that never finished uploading means the tablet 404s trying to download it and aborts its entire content pull.

### `/patients` — Overview (multi-patient only)
- `my_patients_overview()` on load
- One row per patient: name, played-today boolean, flag count, device status
- Sorted by anything needing attention first (active flags, device offline) — a caregiver wants to know who needs them, not an alphabetical list
- Realtime subscription per §7

### `/p/:id/dashboard` — the default single-patient landing
- `patientRow(id)` for name/photo header
- `dailyReportRange(id, today)` for "played today, meds confirmed, minutes"
- `activeFlags(id)` — if any, show at top, prominent
- `patientRow(id).device_last_seen_at` — honest "last synced X ago," never implying live data if it isn't
- Realtime on all of the above

### `/p/:id/trends`
- `dailyReportRange(id, ninetyDaysAgo)` for the base charts
- `activeFlags(id)` for changepoint markers
- "See the evidence" expands a flag to show its `evidence_session_ids`, `z_scores`, `changepoint_date` — all already present in the `flags` row, no extra query needed
- **Note the honest gap:** without the ML engineer's deeper views, this page shows domain-level trends from `daily_domain` but not yet per-person recognition trajectories or savings scores. Build the layout to accommodate those sections now; leave them empty/"coming soon" until the views exist rather than blocking the whole page.

### `/p/:id/report`
- Calls `generate-report` Edge Function once built (§10)
- Until then: build the trigger button and the "generating..." state, wire the actual call last

### `/p/:id/engagement`
- `dailyReportRange(id, ninetyDaysAgo)` — session count, minutes, abandonment, adherence by channel (`via_tablet` vs `via_call` vs `missed` — already columns in `daily_adherence`)
- Calendar heatmap driven by `played` boolean per day

### `/p/:id/messages`
- `memosFor(id)` — list, each with a signed URL fetched on demand for playback (don't pre-fetch all audio)
- Mark `read_at` on play — this is a caregiver-writable field per the RLS policy already in place

### `/p/:id/manage/people`
- CRUD via `useContentMutation('people', id)`
- Photo/voice upload flow same as setup wizard step 2–3

### `/p/:id/manage/medicines`
- CRUD via `useContentMutation('medications', id)`
- **The window/chosen-time UI must respect the server constraint**: `chosen_time_min` is DB-enforced to sit within `[window_start_min, window_end_min]`. Build the slider/picker so it's structurally impossible to submit outside the window — don't rely on the DB rejection as your only validation, since that produces a confusing raw error for the caregiver.
- OCR entry point here (§9)

### `/p/:id/manage/routine`
- CRUD via `useContentMutation('routine_items', id)`

### `/p/:id/manage/alerts`
- Reads/writes `escalation_config` — primary/secondary contact, and optionally the `steps` JSONB if you want to expose ladder timing as configurable (the backend supports it structurally; whether to expose it in UI is a product call, not an architecture one)

### `/p/:id/manage/access`
- `membersFor(id)` — list current caregiver/family_viewer members
- `inviteMember(id, phone, role)` RPC for adding someone
- Only rendered/actionable for callers with `role === 'caregiver'` — a `family_viewer` should not see an invite button, enforced both in UI (don't render it) and it's already enforced server-side by RLS regardless

### `/p/:id/manage/device`
- `patientRow(id)` for `device_last_seen_at`, `device_pending_events`, `device_app_version`
- Pairing generation (§11) if device needs (re)pairing
- Health/status indicator: ok / stale (>24h) / offline (>72h) — matches the watchdog's own thresholds, so the UI and the actual alerting system tell a consistent story

### `/p/:id/care-guide`
- Static content, no backend wiring — CMS-style content or hardcoded, not an architecture concern

---

## 9. OCR flow — build the UI now, the function later

The Edge Function `ocr-prescription` doesn't exist yet. Build the full client flow against a **typed contract** so wiring it later is a one-line swap:

```typescript
// features/medicines/useOcrPrescription.ts
type OcrCandidate = {
  name: string;
  dose: string;
  frequency: string;
  confidence: 'high' | 'low' | 'unrecognized';
  raw_text: string;
};

export function useOcrPrescription() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<{ medications: OcrCandidate[] }> =>
      // once built: supabase.functions.invoke('ocr-prescription', { body: { image_base64, patient_id } })
      mockOcrResponse(imageBase64), // stub for now, swap the implementation later
  });
}
```

**The review UI is the actual safety mechanism and must be built correctly regardless of whether the real function exists yet:**
- Each extracted row shows a confidence badge
- Rows below "high" confidence render visually distinct (not just color — a label too)
- **Save button is disabled until every single row is individually confirmed** by the caregiver
- Explicit copy stating a schedule cannot activate until every line is checked

Build and test this entire flow against the mock. When the real function ships, only `mutationFn`'s body changes.

---

## 10. Report generation — same pattern

```typescript
// features/reports/useGenerateReport.ts
export function useGenerateReport(patientId: string) {
  return useMutation({
    mutationFn: async (months: number) =>
      // once built: supabase.functions.invoke('generate-report', { body: { patient_id: patientId, months } })
      { throw new Error('not yet available'); },
  });
}
```

Build the trigger button, loading state, and "here's your PDF" result UI now. Show a clear "report generation coming soon" state if the call fails with a not-implemented response, rather than a raw error.

---

## 11. Pairing — QR and code generation

```typescript
// features/pairing/usePairingToken.ts
export function usePairingToken(patientId: string) {
  return useMutation({
    mutationFn: () => createPairingToken(patientId), // real, deployed, tested
  });
}
```

- Render the returned token as both a QR code (any QR library, e.g. `qrcode.react`) and as formatted text (`SMRT-K4PQ` style) for the phone-readout path
- Token expires in 30 minutes server-side — show a countdown or at minimum a "generate a new one" affordance once expired
- This is fully live already — no waiting on anything

---

## 12. Cross-patient leakage guards — mandatory, not optional

Concrete rules, because this is a medication app and a leaked/mixed-up patient view is a safety failure, not a cosmetic bug.

```typescript
// 1. EVERY query key includes patientId. Never a bare key.
useQuery({ queryKey: ['medications', patientId], ... })   // correct
useQuery({ queryKey: ['medications'], ... })              // WRONG — will be caught in review

// 2. Clear scoped caches explicitly on patient switch
function switchPatient(nextId: string) {
  queryClient.removeQueries({ queryKey: ['dashboard'] });
  queryClient.removeQueries({ queryKey: ['trends'] });
  queryClient.removeQueries({ queryKey: ['report'] });
  navigate(`/p/${nextId}/dashboard`);
}

// 3. Persistent identity indicator in the layout header, on every page —
//    patient photo + name, always visible, never behind a click to check

// 4. Dev-mode assertion
if (import.meta.env.DEV && data?.patient_id && data.patient_id !== patientId) {
  throw new Error(`Patient mismatch: got ${data.patient_id}, expected ${patientId}`);
}
```

---

## 13. Media upload — the shared pattern

```typescript
// hooks/useMediaUpload.ts
export async function uploadPatientMedia(
  patientId: string, file: File, kind: 'photo' | 'voice'
): Promise<string> {
  const processed = kind === 'photo'
    ? await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 800 })
    : file;

  const path = `${patientId}/${crypto.randomUUID()}.${extensionOf(file)}`;
  const { error } = await supabase.storage.from('patient-media').upload(path, processed);
  if (error) throw error;

  return path; // caller writes THIS into the content row, never a signed URL
}
```

**Compress client-side before upload** — the tablet has to download whatever gets uploaded, often over poor connectivity. **Store the path, never a signed URL** — URLs expire, paths don't, and the tablet resolves paths with its own credentials.

For audio playback in Messages/People pages, generate a short-lived signed URL on demand:

```typescript
const { data } = await supabase.storage.from('patient-media').createSignedUrl(path, 3600);
```

---

## 14. State management summary

- **Server state** (everything from Supabase): TanStack Query exclusively. No Redux, no duplicated state store for data that lives in the database.
- **Auth session**: Supabase's own session object via `AuthProvider` context.
- **Current patient in scope**: derived from the URL param, provided via `PatientContext`, never stored separately in a way that could drift from the URL.
- **Wizard/form state**: local component state or a lightweight form library (`react-hook-form`), scoped to the component, discarded once submitted.

No global client-side store beyond these. If you find yourself wanting one, that's a signal the data actually belongs in TanStack Query instead.

---

## 15. Non-negotiables

1. No file outside `lib/` imports `@supabase/supabase-js`.
2. No query anywhere reads `events`, `sessions`, or `reminder_events` directly — views only.
3. Every content write goes through `useContentMutation`, never a bespoke inline mutation.
4. Every query key includes `patientId` where patient-scoped data is involved.
5. Media path is uploaded and confirmed *before* the row referencing it is written.
6. Store storage paths in the database, never signed URLs.
7. OCR-derived medications require explicit per-row confirmation before they can be saved — build this even against the mock.
8. `family_viewer` role never sees write affordances for content it can't edit — check in UI, understanding RLS is the real enforcement either way.
9. Realtime channels are unsubscribed on component unmount.
10. The patient ID lives in the URL — never solely in memory/state.

---

## 16. Build order

| Order | What | Depends on |
|---|---|---|
| 1 | Project scaffold, `lib/db.ts`, `AuthProvider`, routing shell | Nothing |
| 2 | Sign in, patient-count redirect logic | Step 1 |
| 3 | Create Patient wizard (steps 1, 4, 5, 6 — skip OCR/media at first) | Step 2 |
| 4 | Pairing generation (QR + code) | Step 3 — **unblocks tablet pairing testing immediately** |
| 5 | Dashboard, reading real `daily_report` | Step 3 |
| 6 | People + Medicines management, with photo/voice upload | Step 3 |
| 7 | Trends page against existing views | Step 5 |
| 8 | Multi-patient Overview + switch logic | Step 5 |
| 9 | Messages, Engagement | Step 5 |
| 10 | Access management (invite family) | Step 3 |
| 11 | OCR flow against mock | Step 6 |
| 12 | Report generation trigger against stub | Step 7 |
| 13 | Wire OCR and report to real functions once backend ships them | Backend team |

**Step 4 is the highest-priority early milestone** — it's the point where the web app and tablet app can actually be tested together for the first time, using entirely real, already-deployed infrastructure.