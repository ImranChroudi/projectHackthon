import { useEffect, useState } from 'react';
import { useGroupes, useSalles, useUsers, useAffectations, useModules } from '@/hooks/queries';

/* =========================================================================
   OFPPT Schedule Generator — schedule built 100% by a JS algorithm (no AI/API).
   Reference data (groups, trainers, modules, rooms) is loaded from the backend
   database; the user may tweak it locally before generating.
   ========================================================================= */

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const TEACH_SLOTS = ['8h30–10h30', '10h45–12h45', '13h30–15h30', '15h45–17h45'];

const ALL_SLOTS = [
  '8h30–10h30',
  '10h30–10h45',
  '10h45–12h45',
  '13h30–15h30',
  '15h30–15h45',
  '15h45–17h45',
];

const PAUSE_SLOTS = ['10h30–10h45', '15h30–15h45'];

const COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-yellow-100 text-yellow-800',
  'bg-indigo-100 text-indigo-800',
];

const LAB_KEYWORDS = ['Web', 'Info', 'Réseau', 'Reseau', 'Algo', 'Sys'];

// Plafond hebdomadaire par défaut d'un formateur (heures), aligné sur le backend
// (FORMATEUR_HEURES_HEBDO). Un créneau d'enseignement = 2 h.
const DEFAULT_MAX_HOURS = 25;
const SLOT_HOURS = 2;

/* ---------------------------------------------------------------- helpers */

// Rotate an array left by n positions (n is normalized & non-negative).
function rotate(arr, n) {
  if (arr.length === 0) return arr.slice();
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

// Pick a free room for a module.
//  - Respects the module's allowed-rooms list (Module.salles[]) when defined.
//  - Prefers "Labo Info" first for technical modules.
function pickRoom(moduleName, allowedRooms, day, slot, rooms, roomBusy) {
  // Restrict to the rooms configured on the module, if any are defined.
  let pool = rooms;
  if (allowedRooms && allowedRooms.length) {
    pool = rooms.filter((r) => allowedRooms.includes(r));
    if (pool.length === 0) return null; // configured rooms exist but none are available
  }

  const isTechnical = LAB_KEYWORDS.some((kw) =>
    moduleName.toLowerCase().includes(kw.toLowerCase())
  );

  let candidates = pool;
  if (isTechnical && pool.includes('Labo Info')) {
    candidates = ['Labo Info', ...pool.filter((r) => r !== 'Labo Info')];
  }

  for (const room of candidates) {
    if (roomBusy[room][day][slot] !== true) return room;
  }
  return null;
}

/* ------------------------------------------------------- core algorithm */

function generateSchedule(groups, trainers, modules, rooms, seed = 0) {
  // 1. Build the empty skeleton: schedule[groupId][day][slot] = null
  const schedule = {};
  groups.forEach((g) => {
    schedule[g.id] = {};
    DAYS.forEach((day) => {
      schedule[g.id][day] = {};
      ALL_SLOTS.forEach((slot) => {
        schedule[g.id][day][slot] = null;
      });
    });
  });

  // 2. Tracking sets for trainers and rooms.
  const trainerBusy = {};
  trainers.forEach((t) => {
    trainerBusy[t.id] = {};
    DAYS.forEach((d) => {
      trainerBusy[t.id][d] = {};
    });
  });

  const roomBusy = {};
  rooms.forEach((r) => {
    roomBusy[r] = {};
    DAYS.forEach((d) => {
      roomBusy[r][d] = {};
    });
  });

  const trainerName = (id) => {
    const t = trainers.find((x) => x.id === id);
    return t ? t.name : '—';
  };

  // Per-trainer weekly hour ceiling (Constraint: ≤ maxHours/week per formateur).
  const trainerHours = {}; // trainerId -> hours already placed (across all groups)
  const trainerCap = {}; // trainerId -> ceiling
  trainers.forEach((t) => {
    trainerHours[t.id] = 0;
    trainerCap[t.id] = t.maxHours || DEFAULT_MAX_HOURS;
  });

  // 3–6. Place every module.
  modules.forEach((module, moduleIndex) => {
    const slotsNeeded = Math.ceil(module.hoursPerWeek / 2); // each slot = 2h
    let remaining = slotsNeeded;
    let placedToday = {}; // day -> count of this module placed that day

    // 4. Shuffle days & slots so different modules start on different days.
    const days = rotate(DAYS, moduleIndex + seed);
    const slots = rotate(TEACH_SLOTS, moduleIndex + seed);

    for (const day of days) {
      if (remaining === 0) break;
      for (const slot of slots) {
        if (remaining === 0) break;

        // d) avoid the same module twice the same day
        if ((placedToday[day] || 0) >= 1) break;

        // a) group free
        if (schedule[module.groupId][day][slot] !== null) continue;
        // b) trainer free
        if (trainerBusy[module.trainerId]?.[day]?.[slot] === true) continue;
        // b') trainer weekly hour cap not exceeded (≤ 25h/week per formateur)
        if ((trainerHours[module.trainerId] || 0) + SLOT_HOURS > trainerCap[module.trainerId] + 1e-6)
          continue;

        // c) room free + respects the module's allowed rooms (Labo-Info preference)
        const room = pickRoom(module.name, module.allowedRooms, day, slot, rooms, roomBusy);
        if (!room) continue;

        // assign
        schedule[module.groupId][day][slot] = {
          module: module.name,
          trainer: trainerName(module.trainerId),
          room,
          duration: '2h',
          colorIndex: moduleIndex,
        };
        if (trainerBusy[module.trainerId]) trainerBusy[module.trainerId][day][slot] = true;
        trainerHours[module.trainerId] = (trainerHours[module.trainerId] || 0) + SLOT_HOURS;
        roomBusy[room][day][slot] = true;
        placedToday[day] = (placedToday[day] || 0) + 1;
        remaining--;
      }
    }
  });

  // 7. Summary per group/module.
  const summary = {};
  groups.forEach((g) => {
    summary[g.id] = {};
  });
  modules.forEach((module) => {
    let placedSlots = 0;
    DAYS.forEach((day) => {
      TEACH_SLOTS.forEach((slot) => {
        const cell = schedule[module.groupId][day][slot];
        if (cell && cell.module === module.name) placedSlots++;
      });
    });
    const scheduledHours = placedSlots * 2;
    summary[module.groupId][module.name] = {
      scheduledHours,
      requiredHours: module.hoursPerWeek,
      status: scheduledHours >= module.hoursPerWeek ? 'OK' : 'INCOMPLETE',
    };
  });

  return { schedule, summary };
}

/* ---------------------------------------------- conflict detection (scan) */

function detectConflicts(schedule, groups) {
  const conflicts = []; // { groupId, day, slot, reason }
  const groupIds = groups.map((g) => g.id);

  DAYS.forEach((day) => {
    TEACH_SLOTS.forEach((slot) => {
      const trainerSeen = {};
      const roomSeen = {};
      groupIds.forEach((gid) => {
        const cell = schedule[gid]?.[day]?.[slot];
        if (!cell) return;

        if (trainerSeen[cell.trainer]) {
          conflicts.push({ groupId: gid, day, slot, reason: 'trainer' });
          conflicts.push({ groupId: trainerSeen[cell.trainer], day, slot, reason: 'trainer' });
        } else {
          trainerSeen[cell.trainer] = gid;
        }

        if (roomSeen[cell.room]) {
          conflicts.push({ groupId: gid, day, slot, reason: 'room' });
          conflicts.push({ groupId: roomSeen[cell.room], day, slot, reason: 'room' });
        } else {
          roomSeen[cell.room] = gid;
        }
      });
    });
  });

  // dedupe
  const key = (c) => `${c.groupId}|${c.day}|${c.slot}`;
  const seen = new Set();
  return conflicts.filter((c) => {
    const k = key(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ------------------------------------ map backend documents to the model */

// Groupe  -> { id, name }
const mapGroups = (groupes) =>
  groupes.map((g) => ({ id: g._id, name: g.nom || g.code }));

// User(role=formateur) -> { id, name, maxHours }
const mapTrainers = (formateurs) =>
  formateurs.map((f) => ({
    id: f._id,
    name: [f.prenom, f.nom].filter(Boolean).join(' ') || f.email,
    maxHours: f.heuresHebdo || DEFAULT_MAX_HOURS,
  }));

// Salle -> "nom"
const mapRooms = (salles) => salles.map((s) => s.nom).filter(Boolean);

// Build moduleId -> [allowed room names] from Module.salles[] (populated).
const buildAllowedRooms = (modulesData) => {
  const map = {};
  modulesData.forEach((m) => {
    map[m._id] = (m.salles || []).map((s) => s.nom).filter(Boolean);
  });
  return map;
};

// Affectation (module enseigné à un groupe par un formateur, X h/sem) ->
// { id, name, trainerId, groupId, hoursPerWeek, allowedRooms } — "source de vérité" du générateur.
const mapModules = (affectations, allowedByModule = {}) =>
  affectations.map((a) => ({
    id: a._id,
    name: a.module?.nom || a.module?.code || 'Module',
    trainerId: a.formateur?._id || '',
    groupId: a.groupe?._id || '',
    hoursPerWeek: a.heuresParSemaine || 4,
    allowedRooms: allowedByModule[a.module?._id] || [],
  }));

let idCounter = 100;
const uid = (prefix) => `${prefix}${idCounter++}`;

/* ------------------------------------------------------- main component */

export default function ScheduleGeneratorPage() {
  /* ----- live reference data from the backend / database ----- */
  const groupesQ = useGroupes();
  const sallesQ = useSalles();
  const formateursQ = useUsers({ role: 'formateur' });
  const affectationsQ = useAffectations();
  const modulesQ = useModules();

  const isLoading =
    groupesQ.isLoading ||
    sallesQ.isLoading ||
    formateursQ.isLoading ||
    affectationsQ.isLoading ||
    modulesQ.isLoading;
  const loadError =
    groupesQ.isError ||
    sallesQ.isError ||
    formateursQ.isError ||
    affectationsQ.isError ||
    modulesQ.isError;

  /* ----- local working copy (seeded from the DB, then editable) ----- */
  const [groups, setGroups] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [modules, setModules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsText, setRoomsText] = useState('');
  const [seeded, setSeeded] = useState(false);

  const [newGroup, setNewGroup] = useState('');
  const [newTrainer, setNewTrainer] = useState('');

  const [result, setResult] = useState(null); // { schedule, summary }
  const [conflicts, setConflicts] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [error, setError] = useState('');

  // Seed the working copy from the backend once every dataset has arrived.
  const allLoaded =
    groupesQ.data &&
    sallesQ.data &&
    formateursQ.data &&
    affectationsQ.data &&
    modulesQ.data;

  function seedFromBackend() {
    const g = mapGroups(groupesQ.data || []);
    const r = mapRooms(sallesQ.data || []);
    const allowedByModule = buildAllowedRooms(modulesQ.data || []);
    setGroups(g);
    setTrainers(mapTrainers(formateursQ.data || []));
    setModules(mapModules(affectationsQ.data || [], allowedByModule));
    setRooms(r);
    setRoomsText(r.join(', '));
    setActiveGroup(g[0]?.id || null);
    setResult(null);
    setConflicts([]);
    setError('');
    setSeeded(true);
  }

  useEffect(() => {
    if (allLoaded && !seeded) seedFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded, seeded]);

  // Stable color per module name (so the same module shares a color across groups).
  const moduleColor = (name) => {
    const names = [...new Set(modules.map((m) => m.name))];
    const idx = names.indexOf(name);
    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };

  /* ----- validation ----- */
  function validate() {
    if (groups.length === 0) return 'Veuillez définir au moins un groupe.';
    if (trainers.length === 0) return 'Veuillez définir au moins un formateur.';
    if (modules.length === 0) return 'Veuillez définir au moins un module.';
    for (const m of modules) {
      if (!m.trainerId || !m.groupId) {
        return `Le module « ${m.name || 'sans nom'} » doit avoir un formateur et un groupe.`;
      }
    }
    return '';
  }

  /* ----- generation ----- */
  function runGeneration(seed) {
    const err = validate();
    if (err) {
      setError(err);
      setResult(null);
      setConflicts([]);
      return;
    }
    setError('');
    const parsedRooms = roomsText
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const effectiveRooms = parsedRooms.length ? parsedRooms : rooms;
    setRooms(effectiveRooms);

    const res = generateSchedule(groups, trainers, modules, effectiveRooms, seed);
    setResult(res);
    setConflicts(detectConflicts(res.schedule, groups));
    if (!activeGroup || !groups.find((g) => g.id === activeGroup)) {
      setActiveGroup(groups[0]?.id || null);
    }
  }

  const handleGenerate = () => runGeneration(0);
  const handleShuffle = () => runGeneration(Math.floor(Date.now() / 1000) % 997 + 1);

  /* ----- group / trainer CRUD ----- */
  function addGroup() {
    const name = newGroup.trim();
    if (!name) return;
    const g = { id: uid('g'), name };
    setGroups((p) => [...p, g]);
    setNewGroup('');
  }
  function removeGroup(id) {
    setGroups((p) => p.filter((g) => g.id !== id));
    setModules((p) => p.map((m) => (m.groupId === id ? { ...m, groupId: '' } : m)));
    if (activeGroup === id) setActiveGroup(groups.find((g) => g.id !== id)?.id || null);
  }
  function addTrainer() {
    const name = newTrainer.trim();
    if (!name) return;
    setTrainers((p) => [...p, { id: uid('t'), name }]);
    setNewTrainer('');
  }
  function removeTrainer(id) {
    setTrainers((p) => p.filter((t) => t.id !== id));
    setModules((p) => p.map((m) => (m.trainerId === id ? { ...m, trainerId: '' } : m)));
  }

  /* ----- module CRUD ----- */
  function addModule() {
    setModules((p) => [
      ...p,
      {
        id: uid('m'),
        name: 'Nouveau module',
        trainerId: trainers[0]?.id || '',
        groupId: groups[0]?.id || '',
        hoursPerWeek: 4,
      },
    ]);
  }
  function updateModule(id, patch) {
    setModules((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeModule(id) {
    setModules((p) => p.filter((m) => m.id !== id));
  }

  /* ----- derived for active group ----- */
  const activeGroupObj = groups.find((g) => g.id === activeGroup) || null;
  const activeModules = modules.filter((m) => m.groupId === activeGroup);
  const conflictSet = new Set(conflicts.map((c) => `${c.groupId}|${c.day}|${c.slot}`));

  // Trainer weekly load (hours placed across all groups) — to verify the cap.
  const trainerLoad = (() => {
    if (!result) return [];
    const hours = {};
    trainers.forEach((t) => (hours[t.id] = 0));
    Object.values(result.schedule).forEach((days) =>
      Object.values(days).forEach((slots) =>
        Object.values(slots).forEach((cell) => {
          if (!cell) return;
          const t = trainers.find((x) => x.name === cell.trainer);
          if (t) hours[t.id] += SLOT_HOURS;
        })
      )
    );
    return trainers.map((t) => ({
      name: t.name,
      hours: hours[t.id] || 0,
      cap: t.maxHours || DEFAULT_MAX_HOURS,
    }));
  })();

  /* ====================================================== render ====== */
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* ============================ SIDEBAR ============================ */}
      <aside className="w-[260px] shrink-0 bg-gray-100 border-r border-gray-200 p-4 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📅 Générateur OFPPT</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-gray-500">
              {isLoading
                ? 'Chargement des données…'
                : loadError
                ? 'Erreur de chargement'
                : 'Données de la base'}
            </span>
            <button
              onClick={seedFromBackend}
              disabled={isLoading || !allLoaded}
              className="text-[11px] text-blue-600 hover:underline disabled:text-gray-300"
              title="Recharger depuis la base de données"
            >
              ↻ Recharger
            </button>
          </div>
          {loadError && (
            <p className="mt-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700 border border-red-200">
              Impossible de charger les données du backend.
            </p>
          )}
        </div>

        {/* Groups */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Groupes
          </h2>
          <div className="flex gap-1 mb-2">
            <input
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="G103…"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            />
            <button
              onClick={addGroup}
              className="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <ul className="space-y-1">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm border border-gray-200"
              >
                <span>{g.name}</span>
                <button
                  onClick={() => removeGroup(g.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Supprimer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Trainers */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Formateurs
          </h2>
          <div className="flex gap-1 mb-2">
            <input
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Nom du formateur"
              value={newTrainer}
              onChange={(e) => setNewTrainer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTrainer()}
            />
            <button
              onClick={addTrainer}
              className="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <ul className="space-y-1">
            {trainers.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm border border-gray-200"
              >
                <span>{t.name}</span>
                <button
                  onClick={() => removeTrainer(t.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Supprimer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Modules */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Modules
          </h2>
          <div className="space-y-2">
            {modules.map((m) => (
              <div
                key={m.id}
                className="rounded border border-gray-200 bg-white p-2 space-y-1"
              >
                <div className="flex gap-1">
                  <input
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                    value={m.name}
                    onChange={(e) => updateModule(m.id, { name: e.target.value })}
                  />
                  <button
                    onClick={() => removeModule(m.id)}
                    className="text-gray-400 hover:text-red-600 px-1"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
                <select
                  className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                  value={m.trainerId}
                  onChange={(e) => updateModule(m.id, { trainerId: e.target.value })}
                >
                  <option value="">— formateur —</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <select
                    className="flex-1 rounded border border-gray-300 px-1 py-1 text-xs"
                    value={m.groupId}
                    onChange={(e) => updateModule(m.id, { groupId: e.target.value })}
                  >
                    <option value="">— groupe —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded border border-gray-300 px-1 py-1 text-xs"
                    value={m.hoursPerWeek}
                    onChange={(e) =>
                      updateModule(m.id, { hoursPerWeek: Number(e.target.value) })
                    }
                  >
                    <option value={2}>2h</option>
                    <option value={4}>4h</option>
                    <option value={6}>6h</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addModule}
            className="mt-2 w-full rounded border border-dashed border-gray-400 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            + Add module
          </button>
        </section>

        {/* Rooms */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Salles
          </h2>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Salle 1, Salle 2, Labo Info"
            value={roomsText}
            onChange={(e) => setRoomsText(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-gray-400">Séparées par des virgules</p>
        </section>

        {/* Generate */}
        <section className="space-y-2">
          <button
            onClick={handleGenerate}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700"
          >
            ⚙️ Generate Schedule
          </button>
          <button
            onClick={handleShuffle}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            🔀 Shuffle & Regenerate
          </button>
          {error && (
            <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 border border-red-200">
              {error}
            </p>
          )}
        </section>
      </aside>

      {/* ============================ MAIN ============================ */}
      <main className="flex-grow p-6 overflow-x-auto">
        {!result ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p>Configurez vos données puis cliquez sur « Generate Schedule ».</p>
          </div>
        ) : (
          <>
            {/* Conflict banner */}
            {conflicts.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
                ⚠ {conflicts.length} conflit(s) détecté(s) — essayez de régénérer.
              </div>
            )}

            {/* Trainer weekly load vs cap (constraint: ≤ cap h/week per formateur) */}
            {trainerLoad.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {trainerLoad.map((t) => {
                  const over = t.hours > t.cap;
                  return (
                    <span
                      key={t.name}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        over
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      title="Charge hebdomadaire / plafond"
                    >
                      {t.name}: {t.hours}h / {t.cap}h{over ? ' ⚠' : ''}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Group tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    activeGroup === g.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {activeGroupObj && (
              <>
                {/* Schedule table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-sm text-gray-700">
                        <th className="w-32 border-b border-gray-200 px-3 py-2 text-left">
                          Horaire
                        </th>
                        {DAYS.map((d) => (
                          <th
                            key={d}
                            className="border-b border-l border-gray-200 px-3 py-2 text-center"
                          >
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_SLOTS.map((slot) => {
                        const isPause = PAUSE_SLOTS.includes(slot);
                        if (isPause) {
                          return (
                            <tr key={slot} className="bg-amber-50">
                              <td className="border-b border-gray-200 px-3 py-1 text-xs font-medium text-amber-700">
                                {slot}
                              </td>
                              <td
                                colSpan={DAYS.length}
                                className="border-b border-l border-gray-200 px-3 py-1 text-center text-sm text-amber-700"
                              >
                                ☕ Pause
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={slot}>
                            <td className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 align-top">
                              {slot}
                            </td>
                            {DAYS.map((day) => {
                              const cell =
                                result.schedule[activeGroup]?.[day]?.[slot] || null;
                              const isConflict = conflictSet.has(
                                `${activeGroup}|${day}|${slot}`
                              );
                              return (
                                <td
                                  key={day}
                                  className="h-20 border-b border-l border-gray-200 p-1 align-top"
                                >
                                  {cell ? (
                                    <div
                                      className={`h-full rounded-md p-1.5 ${
                                        isConflict
                                          ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                                          : moduleColor(cell.module)
                                      }`}
                                    >
                                      <div className="text-[12px] font-bold leading-tight">
                                        {cell.module}
                                      </div>
                                      <div className="text-[11px] opacity-80">
                                        {cell.trainer}
                                      </div>
                                      <div className="text-[10px] opacity-60">
                                        {cell.room}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-gray-300">
                                      —
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary cards */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {activeModules.map((m) => {
                    const s =
                      result.summary[activeGroup]?.[m.name] || {
                        scheduledHours: 0,
                        requiredHours: m.hoursPerWeek,
                        status: 'INCOMPLETE',
                      };
                    const ok = s.status === 'OK';
                    return (
                      <div
                        key={m.id}
                        className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <div className="text-sm font-semibold text-gray-800">
                          {m.name}
                        </div>
                        <div className="mt-1 text-2xl font-bold text-gray-900">
                          {s.scheduledHours}h{' '}
                          <span className="text-sm font-normal text-gray-400">
                            / {s.requiredHours}h
                          </span>
                        </div>
                        <span
                          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            ok
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {ok ? '✓ OK' : '⚠ Incomplete'}
                        </span>
                      </div>
                    );
                  })}
                  {activeModules.length === 0 && (
                    <p className="text-sm text-gray-400">
                      Aucun module pour ce groupe.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
