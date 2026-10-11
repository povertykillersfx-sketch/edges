import { normalizePortal } from "./data.js";
import { supabase } from "./supabase.js";

const BUCKET = "ea-media";

export function isEmptyPortal(portal) {
  if (!portal) return true;
  return [portal.keys, portal.profiles, portal.mentors, portal.subscriptions].every(
    (list) => !list || list.length === 0
  );
}

function at(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function stamp(value) {
  const time = typeof value === "number" && value > 0 ? value : Date.now();
  return new Date(time).toISOString();
}

function mentorFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    instagram: row.instagram,
    telegram: row.telegram,
    telegramOn: row.telegram_on,
    passwordHash: row.password_hash,
    market: row.market,
    status: row.status,
    at: at(row.created_at),
  };
}

function profileFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    mentorName: row.mentor_name,
    mentorId: row.mentor_id,
    symbols: row.symbols,
    picture: row.picture_url,
    media: row.media_url,
    at: at(row.created_at),
  };
}

function keyFromRow(row) {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    name: row.name,
    email: row.email,
    term: row.term,
    status: row.status,
    eaName: row.ea_name,
    profileId: row.profile_id,
    mentorId: row.mentor_id,
    picture: row.picture_url,
    at: at(row.created_at),
  };
}

function subscriptionFromRow(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    holder: row.holder,
    plan: row.plan,
    keyId: row.key_id,
    days: Number(row.days),
    status: row.status,
    at: at(row.created_at),
  };
}

export function portalFromRows(rows) {
  const settings = rows.settings ?? {};
  const identity = rows.identity ?? {};
  return normalizePortal({
    settings: {
      volume: Number(settings.volume),
      days: Number(settings.days),
      autoApprove: settings.auto_approve === true,
    },
    identity: {
      firstName: identity.first_name,
      lastName: identity.last_name,
      email: identity.email,
      mentorName: identity.mentor_name,
      licenseId: identity.license_id,
      profileId: identity.profile_id,
    },
    mentors: (rows.mentors ?? []).map(mentorFromRow),
    profiles: (rows.profiles ?? []).map(profileFromRow),
    keys: (rows.keys ?? []).map(keyFromRow),
    subscriptions: (rows.subscriptions ?? []).map(subscriptionFromRow),
  });
}

function mentorRow(item) {
  return {
    id: item.id,
    name: item.name,
    full_name: item.fullName,
    display_name: item.displayName,
    first_name: item.firstName,
    last_name: item.lastName,
    email: item.email,
    phone: item.phone,
    instagram: item.instagram,
    telegram: item.telegram,
    telegram_on: item.telegramOn,
    password_hash: item.passwordHash,
    market: item.market,
    status: item.status,
    created_at: stamp(item.at),
  };
}

function profileRow(item) {
  return {
    id: item.id,
    name: item.name,
    mentor_name: item.mentorName,
    mentor_id: item.mentorId,
    symbols: item.symbols,
    picture_url: item.picture,
    media_url: item.media,
    created_at: stamp(item.at),
  };
}

function keyRow(item) {
  return {
    id: item.id,
    code: item.code,
    label: item.label,
    name: item.name,
    email: item.email,
    term: item.term,
    status: item.status,
    ea_name: item.eaName,
    profile_id: item.profileId,
    mentor_id: item.mentorId,
    picture_url: item.picture,
    created_at: stamp(item.at),
  };
}

function subscriptionRow(item) {
  return {
    id: item.id,
    first_name: item.firstName,
    last_name: item.lastName,
    email: item.email,
    holder: item.holder,
    plan: item.plan,
    key_id: item.keyId,
    days: item.days,
    status: item.status,
    created_at: stamp(item.at),
  };
}

const ASSET_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function dataUrlToBlob(dataUrl) {
  const [header, body] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

async function publishAsset(dataUrl, path) {
  const blob = dataUrlToBlob(dataUrl);
  const fullPath = `${path}-${Date.now().toString(36)}.${ASSET_EXT[blob.type] || "bin"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, blob, {
    upsert: true,
    contentType: blob.type || "application/octet-stream",
    cacheControl: "3600",
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(fullPath).data.publicUrl;
}

function ownedBy(list, mentorId) {
  return (list ?? []).filter((item) => item.mentorId === mentorId);
}

export function syncPlan(portal, scope = {}) {
  const account = scope.account || "";
  const mentorId = scope.mentorId || "";
  if (account === "mentor" && mentorId) {
    return {
      account,
      mentorId,
      mentors: (portal.mentors ?? []).filter((item) => item.id === mentorId),
      profiles: ownedBy(portal.profiles, mentorId),
      keys: ownedBy(portal.keys, mentorId),
      subscriptions: [],
      identity: false,
      settings: false,
    };
  }
  if (account === "admin") {
    return {
      account,
      mentorId: "",
      mentors: portal.mentors ?? [],
      profiles: portal.profiles ?? [],
      keys: portal.keys ?? [],
      subscriptions: portal.subscriptions ?? [],
      identity: true,
      settings: true,
    };
  }
  return {
    account,
    mentorId: "",
    mentors: portal.mentors ?? [],
    profiles: [],
    keys: [],
    subscriptions: portal.subscriptions ?? [],
    identity: account === "app",
    settings: false,
  };
}

async function publishPortal(portal, scope) {
  const next = structuredClone(portal);
  const plan = syncPlan(next, scope);
  const replacements = [];
  const profiles = plan.account === "admin" ? next.profiles : plan.profiles;
  const keys = plan.account === "admin" ? next.keys : plan.keys;
  for (const profile of profiles) {
    if (profile.picture?.startsWith("data:")) {
      const from = profile.picture;
      const to = await publishAsset(from, `profiles/${profile.id}/picture`);
      profile.picture = to;
      replacements.push({ kind: "profile", id: profile.id, field: "picture", from, to });
    }
    if (profile.media?.startsWith("data:")) {
      const from = profile.media;
      const to = await publishAsset(from, `profiles/${profile.id}/media`);
      profile.media = to;
      replacements.push({ kind: "profile", id: profile.id, field: "media", from, to });
    }
  }
  for (const key of keys) {
    if (!key.picture?.startsWith("data:")) continue;
    const from = key.picture;
    const profile = next.profiles.find((item) => item.id === key.profileId);
    const to = profile?.picture?.startsWith("http")
      ? profile.picture
      : await publishAsset(from, `keys/${key.id}/picture`);
    key.picture = to;
    replacements.push({ kind: "key", id: key.id, field: "picture", from, to });
  }
  return { portal: normalizePortal(next), replacements };
}

export function applyAssetUrls(portal, replacements) {
  if (!replacements?.length) return portal;
  let changed = false;
  const profiles = portal.profiles.map((profile) => {
    let next = profile;
    for (const item of replacements) {
      if (item.kind !== "profile" || item.id !== profile.id) continue;
      if (next[item.field] !== item.from) continue;
      next = { ...next, [item.field]: item.to };
      changed = true;
    }
    return next;
  });
  const keys = portal.keys.map((key) => {
    let next = key;
    for (const item of replacements) {
      if (item.kind !== "key" || item.id !== key.id || item.field !== "picture") continue;
      if (next.picture !== item.from) continue;
      next = { ...next, picture: item.to };
      changed = true;
    }
    return next;
  });
  return changed ? { ...portal, profiles, keys } : portal;
}

function idList(rows) {
  return rows.map((row) => row.id).filter((id) => /^[\w-]+$/.test(id));
}

async function upsertRows(table, rows) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw error;
}

async function deleteMissing(table, ids, owner) {
  let query = supabase.from(table).delete();
  if (owner) query = query.eq(owner.column, owner.value);
  if (ids.length === 0) {
    query = owner ? query : query.not("id", "is", null);
  } else {
    query = query.not("id", "in", `(${ids.map((id) => `"${id}"`).join(",")})`);
  }
  const { error } = await query;
  if (error) throw error;
}

async function writeTable(table, rows) {
  await upsertRows(table, rows);
  await deleteMissing(table, idList(rows));
}

async function writeOwned(table, rows, owner) {
  await upsertRows(table, rows);
  await deleteMissing(table, idList(rows), owner);
}

async function writeIdentity(identity) {
  const identityWrite = await supabase.from("identity").upsert({
    id: 1,
    first_name: identity.firstName ?? "",
    last_name: identity.lastName ?? "",
    email: identity.email ?? "",
    mentor_name: identity.mentorName ?? "",
    license_id: identity.licenseId ?? "",
    profile_id: identity.profileId ?? "",
  });
  if (identityWrite.error) throw identityWrite.error;
}

async function writeSettings(settings) {
  const settingWrite = await supabase.from("desk_settings").upsert({
    id: 1,
    volume: settings.volume,
    days: settings.days,
    auto_approve: settings.autoApprove,
  });
  if (settingWrite.error) throw settingWrite.error;
}

let seenReady = false;
const seenSubscriptions = new Map();
const seenMentors = new Map();

function subscriptionStamp(item) {
  return [item.status, item.keyId || "", item.email || ""].join("|");
}

function mentorStamp(item) {
  return [item.status, item.passwordHash || "", item.displayName || "", item.phone || "", item.telegram || "", item.telegramOn === true].join("|");
}

export function rememberRemote(portal) {
  seenReady = true;
  seenSubscriptions.clear();
  seenMentors.clear();
  for (const item of portal?.subscriptions ?? []) seenSubscriptions.set(item.id, subscriptionStamp(item));
  for (const item of portal?.mentors ?? []) seenMentors.set(item.id, mentorStamp(item));
}

function changedRows(list, seen, stamp) {
  const rows = list ?? [];
  if (!seenReady) return rows;
  return rows.filter((item) => seen.get(item.id) !== stamp(item));
}

function mergeRows(localList = [], remoteList = [], seen, stamp) {
  const remoteById = new Map((remoteList ?? []).filter((item) => item?.id).map((item) => [item.id, item]));
  const localIds = new Set();
  const merged = (localList ?? []).map((item) => {
    localIds.add(item.id);
    const remoteItem = remoteById.get(item.id);
    if (!remoteItem) return item;
    if (seen && stamp && seenReady && seen.get(item.id) !== stamp(item)) return item;
    return remoteItem;
  });
  for (const item of remoteList ?? []) {
    if (item?.id && !localIds.has(item.id)) merged.push(item);
  }
  return merged;
}

export function mergePortal(local, remote, { takeRemoteIdentity = false } = {}) {
  if (!remote) return local;
  if (!local) return remote;
  return {
    ...local,
    settings: takeRemoteIdentity ? remote.settings ?? local.settings : local.settings,
    identity: takeRemoteIdentity ? remote.identity ?? local.identity : local.identity,
    mentors: mergeRows(local.mentors, remote.mentors, seenMentors, mentorStamp),
    profiles: mergeRows(local.profiles, remote.profiles),
    keys: mergeRows(local.keys, remote.keys),
    subscriptions: mergeRows(local.subscriptions, remote.subscriptions, seenSubscriptions, subscriptionStamp),
  };
}

export async function saveSubscription(item) {
  if (!supabase || !item?.id) return;
  const { error } = await supabase.from("subscriptions").upsert(subscriptionRow(item));
  if (error) throw error;
  if (seenReady) seenSubscriptions.set(item.id, subscriptionStamp(item));
}

export async function saveMentor(item) {
  if (!supabase || !item?.id) return;
  const { error } = await supabase.from("mentors").upsert(mentorRow(item));
  if (error) throw error;
  if (seenReady) seenMentors.set(item.id, mentorStamp(item));
}

async function writePortal(portal, scope) {
  const plan = syncPlan(portal, scope);
  if (plan.account === "mentor" && plan.mentorId) {
    const mentors = changedRows(plan.mentors, seenMentors, mentorStamp);
    await upsertRows("mentors", mentors.map(mentorRow));
    for (const item of mentors) seenMentors.set(item.id, mentorStamp(item));
    await writeOwned("ea_profiles", plan.profiles.map(profileRow), { column: "mentor_id", value: plan.mentorId });
    await writeOwned("license_keys", plan.keys.map(keyRow), { column: "mentor_id", value: plan.mentorId });
    return;
  }
  if (plan.settings) await writeSettings(portal.settings ?? {});
  if (plan.identity) await writeIdentity(portal.identity ?? {});
  const mentors = changedRows(plan.mentors, seenMentors, mentorStamp);
  const subscriptions = changedRows(plan.subscriptions, seenSubscriptions, subscriptionStamp);
  await upsertRows("mentors", mentors.map(mentorRow));
  await upsertRows("subscriptions", subscriptions.map(subscriptionRow));
  for (const item of mentors) seenMentors.set(item.id, mentorStamp(item));
  for (const item of subscriptions) seenSubscriptions.set(item.id, subscriptionStamp(item));
  if (plan.account === "admin") {
    await writeTable("ea_profiles", plan.profiles.map(profileRow));
    await writeTable("license_keys", plan.keys.map(keyRow));
  }
}

async function readTable(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  return data ?? [];
}

export async function loadRemotePortal() {
  if (!supabase) return null;
  const [settings, identity, mentors, profiles, keys, subscriptions] = await Promise.all([
    readTable("desk_settings"),
    readTable("identity"),
    readTable("mentors"),
    readTable("ea_profiles"),
    readTable("license_keys"),
    readTable("subscriptions"),
  ]);
  return portalFromRows({
    settings: settings[0],
    identity: identity[0],
    mentors,
    profiles,
    keys,
    subscriptions,
  });
}

let latest = null;
let chain = Promise.resolve(null);

export function syncPortal(portal, scope = {}) {
  if (!supabase) return Promise.resolve(null);
  const snapshot = structuredClone(portal);
  const scopeSnapshot = { account: scope.account || "", mentorId: scope.mentorId || "" };
  latest = snapshot;
  const scheduled = chain.then(async () => {
    if (latest !== snapshot) return null;
    latest = null;
    const published = await publishPortal(snapshot, scopeSnapshot);
    if (latest) return null;
    await writePortal(published.portal, scopeSnapshot);
    if (latest) return null;
    return published.replacements.length ? published.replacements : null;
  });
  chain = scheduled.then(
    () => null,
    () => null
  );
  return scheduled;
}
