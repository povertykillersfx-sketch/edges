import { supabase, isRemote } from "../../supabase.js";
import { BUILTIN_TEMPLATES, getBuiltinTemplate, mergeTemplateRow } from "./templates.js";
import { slugify, validateSlug, validateWebsiteConfig, validateUpload, sanitizeText } from "./validation.js";
import { createCheckoutIntent } from "./payments.js";
import {
  BOOTSTRAP_USER_ID,
  bootstrapProfile,
  clearBootstrapSession,
  getLocalSite,
  loadBootstrapSession,
  loadLocalSites,
  matchBootstrapCredentials,
  saveBootstrapSession,
  upsertLocalSite,
} from "./bootstrap.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

function isBootstrapOwner(ownerId) {
  return ownerId === BOOTSTRAP_USER_ID || Boolean(loadBootstrapSession());
}

export async function getSessionUser() {
  const boot = loadBootstrapSession();
  if (boot) {
    return { id: BOOTSTRAP_USER_ID, email: boot.email, bootstrap: true };
  }
  if (!isRemote) return null;
  const { data, error } = await requireClient().auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function signUp({ email, password, fullName }) {
  if (await matchBootstrapCredentials(email, password)) {
    saveBootstrapSession();
    return { user: { id: BOOTSTRAP_USER_ID, email }, session: { bootstrap: true }, bootstrap: true };
  }
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || "" } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  if (await matchBootstrapCredentials(email, password)) {
    saveBootstrapSession();
    return { user: { id: BOOTSTRAP_USER_ID, email }, session: { bootstrap: true }, bootstrap: true };
  }
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  clearBootstrapSession();
  if (!isRemote) return;
  const { error } = await requireClient().auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const client = requireClient();
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const redirectTo = `${window.location.origin}${base}/studio/reset`;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await requireClient().auth.updateUser({ password });
  if (error) throw error;
}

export async function fetchProfile(userId) {
  if (userId === BOOTSTRAP_USER_ID || loadBootstrapSession()) {
    return bootstrapProfile();
  }
  try {
    const { data, error } = await requireClient()
      .from("ss_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    if (loadBootstrapSession()) return bootstrapProfile();
    throw error;
  }
}

export async function updateProfile(userId, patch) {
  if (userId === BOOTSTRAP_USER_ID || loadBootstrapSession()) {
    const next = { ...bootstrapProfile(), full_name: sanitizeText(patch.full_name, { max: 120 }) };
    return next;
  }
  const { data, error } = await requireClient()
    .from("ss_profiles")
    .update({
      full_name: sanitizeText(patch.full_name, { max: 120 }),
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export const BUILTIN_PLANS = [
  { id: "starter", name: "Starter", description: "One published site", price_cents: 29900, currency: "ZAR", billing_interval: "monthly", setup_fee_cents: 0, max_websites: 1, max_storage_mb: 100, custom_domain: false, features: ["1 website", "Subdomain publish"], active: true, sort_order: 1 },
  { id: "growth", name: "Growth", description: "Multiple sites + custom domain", price_cents: 69900, currency: "ZAR", billing_interval: "setup_monthly", setup_fee_cents: 150000, max_websites: 3, max_storage_mb: 500, custom_domain: true, features: ["3 websites", "Custom domain"], active: true, sort_order: 2 },
  { id: "agency", name: "Agency", description: "Agency limits", price_cents: 149900, currency: "ZAR", billing_interval: "setup_monthly", setup_fee_cents: 350000, max_websites: 15, max_storage_mb: 2048, custom_domain: true, features: ["15 websites", "Custom domains"], active: true, sort_order: 3 },
];

export async function listPlans() {
  if (!isRemote || isBootstrapOwner()) {
    return BUILTIN_PLANS.map((p) => ({ ...p }));
  }
  try {
    const { data, error } = await requireClient().from("ss_plans").select("*").eq("active", true).order("sort_order");
    if (error) {
      console.warn("ss_plans unavailable, using builtins", error.message);
      return BUILTIN_PLANS.map((p) => ({ ...p }));
    }
    return data?.length ? data : BUILTIN_PLANS.map((p) => ({ ...p }));
  } catch (error) {
    console.warn("ss_plans unavailable, using builtins", error?.message || error);
    return BUILTIN_PLANS.map((p) => ({ ...p }));
  }
}

export async function listTemplates() {
  if (!isRemote) return BUILTIN_TEMPLATES.map((t) => ({ ...t }));
  const { data, error } = await requireClient()
    .from("ss_templates")
    .select("*")
    .eq("status", "published")
    .order("name");
  if (error) {
    console.warn("ss_templates unavailable, using builtins", error.message);
    return BUILTIN_TEMPLATES.map((t) => ({ ...t }));
  }
  if (!data?.length) return BUILTIN_TEMPLATES.map((t) => ({ ...t }));

  const withVersions = await Promise.all(
    data.map(async (row) => {
      const { data: versions } = await requireClient()
        .from("ss_template_versions")
        .select("*")
        .eq("template_id", row.id)
        .order("version", { ascending: false })
        .limit(1);
      const version = versions?.[0];
      return mergeTemplateRow({
        ...row,
        schema: version?.schema,
        default_config: version?.default_config,
        template_version: version?.version || 1,
      });
    })
  );
  return withVersions;
}

export async function getTemplate(templateId) {
  const list = await listTemplates();
  return list.find((t) => t.id === templateId) || getBuiltinTemplate(templateId);
}

export async function listWebsites(ownerId) {
  if (isBootstrapOwner(ownerId)) {
    return loadLocalSites().filter((site) => site.owner_id === ownerId || site.owner_id === BOOTSTRAP_USER_ID);
  }
  try {
    const { data, error } = await requireClient()
      .from("ss_websites")
      .select("*, ss_website_configs(draft, published, updated_at)")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.warn("ss_websites unavailable, using local sites", error.message);
      return loadLocalSites();
    }
    return data || [];
  } catch (error) {
    console.warn("ss_websites unavailable, using local sites", error?.message || error);
    return loadLocalSites();
  }
}

export async function getWebsite(websiteId) {
  const local = getLocalSite(websiteId);
  if (local) return local;
  if (isBootstrapOwner()) return null;
  try {
    const { data, error } = await requireClient()
      .from("ss_websites")
      .select("*, ss_website_configs(draft, published, updated_at)")
      .eq("id", websiteId)
      .maybeSingle();
    if (error) {
      console.warn("ss_websites unavailable", error.message);
      return getLocalSite(websiteId);
    }
    return data;
  } catch (error) {
    console.warn("ss_websites unavailable", error?.message || error);
    return getLocalSite(websiteId);
  }
}

export async function getPublishedBySlug(slug) {
  const clean = slugify(slug);
  const local = loadLocalSites().find((site) => site.slug === clean && site.status === "published");
  if (local) return local;
  if (!isRemote) return null;
  try {
    const { data: website, error } = await requireClient()
      .from("ss_websites")
      .select("*, ss_website_configs(published)")
      .eq("slug", clean)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    return website;
  } catch {
    return null;
  }
}

export async function createWebsite({ ownerId, templateId, name, slug }) {
  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found.");
  const slugResult = validateSlug(slug || name);
  if (!slugResult.ok) throw new Error(slugResult.error);

  const profile = await fetchProfile(ownerId);
  const planId = profile?.plan_id || "starter";
  const plans = await listPlans();
  const plan = plans.find((p) => p.id === planId) || plans.find((p) => p.id === "starter") || plans[0];
  if (template.min_plan_id && plan) {
    const rank = { starter: 1, growth: 2, agency: 3 };
    if ((rank[plan.id] || 1) < (rank[template.min_plan_id] || 1)) {
      throw new Error(`Template "${template.name}" requires the ${template.min_plan_id} plan or higher.`);
    }
  }
  const existing = await listWebsites(ownerId);
  if (plan && existing.length >= (plan.max_websites || 1)) {
    throw new Error(`Your plan allows ${plan.max_websites} website(s). Upgrade to create more.`);
  }

  if (isBootstrapOwner(ownerId)) {
    const now = new Date().toISOString();
    const website = {
      id: crypto.randomUUID(),
      owner_id: BOOTSTRAP_USER_ID,
      template_id: templateId,
      template_version: template.template_version || 1,
      name: sanitizeText(name, { max: 80 }) || template.name,
      slug: slugResult.value,
      status: "draft",
      published_at: null,
      created_at: now,
      updated_at: now,
      ss_website_configs: {
        draft: template.default_config || {},
        published: {},
        updated_at: now,
      },
      domains: [
        {
          hostname: `${slugResult.value}.swagstack.local`,
          kind: "subdomain",
          status: "pending",
        },
      ],
    };
    upsertLocalSite(website);
    return website;
  }

  const { data: website, error } = await requireClient()
    .from("ss_websites")
    .insert({
      owner_id: ownerId,
      template_id: templateId,
      template_version: template.template_version || 1,
      name: sanitizeText(name, { max: 80 }) || template.name,
      slug: slugResult.value,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;

  const draft = template.default_config || {};
  const { error: configError } = await requireClient().from("ss_website_configs").insert({
    website_id: website.id,
    draft,
    published: {},
  });
  if (configError) throw configError;

  await requireClient().from("ss_domains").insert({
    website_id: website.id,
    owner_id: ownerId,
    hostname: `${slugResult.value}.swagstack.local`,
    kind: "subdomain",
    status: "pending",
    dns_instructions: {
      note: "Platform subdomain publishing is active in-app at /s/" + slugResult.value,
      production: "Point *.your-platform-domain to this Vercel project after DNS is configured.",
    },
  });

  await writeAudit(ownerId, "website.create", "website", website.id, { templateId, slug: slugResult.value });
  return website;
}

export async function saveWebsiteDraft(websiteId, draft, schemaFields = []) {
  const validated = validateWebsiteConfig(draft, schemaFields);
  if (!validated.ok) {
    const err = new Error(validated.errors.join(" "));
    err.validation = validated.errors;
    throw err;
  }
  const local = getLocalSite(websiteId);
  if (local) {
    const next = {
      ...local,
      updated_at: new Date().toISOString(),
      ss_website_configs: {
        ...(local.ss_website_configs || {}),
        draft: validated.value,
        updated_at: new Date().toISOString(),
      },
    };
    upsertLocalSite(next);
    return validated.value;
  }
  const { error } = await requireClient()
    .from("ss_website_configs")
    .update({ draft: validated.value, updated_at: new Date().toISOString() })
    .eq("website_id", websiteId);
  if (error) throw error;
  await requireClient()
    .from("ss_websites")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", websiteId);
  return validated.value;
}

export async function publishWebsite(websiteId, actorId) {
  const website = await getWebsite(websiteId);
  if (!website) throw new Error("Website not found.");
  const draft = website.ss_website_configs?.draft || {};
  const template = await getTemplate(website.template_id);
  const validated = validateWebsiteConfig(draft, template?.schema?.fields || []);
  if (!validated.ok) throw new Error(validated.errors.join(" "));

  if (getLocalSite(websiteId)) {
    const next = {
      ...website,
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ss_website_configs: {
        ...(website.ss_website_configs || {}),
        draft: validated.value,
        published: validated.value,
        updated_at: new Date().toISOString(),
      },
    };
    upsertLocalSite(next);
    return next;
  }

  const { error: configError } = await requireClient()
    .from("ss_website_configs")
    .update({ published: validated.value, updated_at: new Date().toISOString() })
    .eq("website_id", websiteId);
  if (configError) throw configError;

  const { data, error } = await requireClient()
    .from("ss_websites")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", websiteId)
    .select("*")
    .single();
  if (error) throw error;

  await requireClient()
    .from("ss_domains")
    .update({ status: "active" })
    .eq("website_id", websiteId)
    .eq("kind", "subdomain");

  await writeAudit(actorId, "website.publish", "website", websiteId, { slug: data.slug });
  return data;
}

export async function unpublishWebsite(websiteId, actorId) {
  const local = getLocalSite(websiteId);
  if (local) {
    const next = { ...local, status: "unpublished", updated_at: new Date().toISOString() };
    upsertLocalSite(next);
    return next;
  }
  const { data, error } = await requireClient()
    .from("ss_websites")
    .update({ status: "unpublished" })
    .eq("id", websiteId)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit(actorId, "website.unpublish", "website", websiteId, {});
  return data;
}

export async function uploadMedia({ ownerId, websiteId, file }) {
  const check = validateUpload(file);
  if (!check.ok) throw new Error(check.error);
  if (isBootstrapOwner(ownerId)) {
    const publicUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
    return {
      id: crypto.randomUUID(),
      owner_id: BOOTSTRAP_USER_ID,
      website_id: websiteId || null,
      bucket_path: `local/${websiteId || "library"}/${file.name}`,
      public_url: publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      created_at: new Date().toISOString(),
    };
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${ownerId}/${websiteId || "library"}/${crypto.randomUUID()}.${ext}`;
  const client = requireClient();
  const { error: uploadError } = await client.storage.from("swagstack-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data: pub } = client.storage.from("swagstack-media").getPublicUrl(path);
  const { data, error } = await client
    .from("ss_media_assets")
    .insert({
      owner_id: ownerId,
      website_id: websiteId || null,
      bucket_path: path,
      public_url: pub.publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select("*")
    .single();
  if (error) throw error;
  await client.from("ss_usage_records").insert({
    owner_id: ownerId,
    metric: "storage_bytes",
    quantity: file.size,
    metadata: { path },
  });
  return data;
}

export async function listMedia(ownerId, websiteId) {
  if (isBootstrapOwner(ownerId)) return [];
  let query = requireClient().from("ss_media_assets").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (websiteId) query = query.eq("website_id", websiteId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addCustomDomain({ ownerId, websiteId, hostname }) {
  const host = sanitizeText(hostname, { max: 253 }).toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) throw new Error("Enter a valid hostname like www.example.co.za");
  const token = crypto.randomUUID().replace(/-/g, "");
  const row = {
    id: crypto.randomUUID(),
    website_id: websiteId,
    owner_id: ownerId,
    hostname: host,
    kind: "custom",
    status: "pending",
    verification_token: token,
    dns_instructions: {
      records: [
        { type: "CNAME", host, value: "cname.vercel-dns.com", note: "Or your platform DNS target" },
        { type: "TXT", host: `_swagstack.${host}`, value: `swagstack-verify=${token}` },
      ],
      note: "Custom domain activation requires DNS at your registrar and Vercel domain attachment. Status stays pending until verified.",
    },
  };
  if (isBootstrapOwner(ownerId)) {
    const site = getLocalSite(websiteId);
    if (site) {
      site.domains = [...(site.domains || []), row];
      upsertLocalSite(site);
    }
    return row;
  }
  const { data, error } = await requireClient().from("ss_domains").insert(row).select("*").single();
  if (error) throw error;
  await writeAudit(ownerId, "domain.add", "domain", data.id, { hostname: host });
  return data;
}

export async function listDomains(ownerId, websiteId) {
  if (isBootstrapOwner(ownerId)) {
    const sites = loadLocalSites().filter((site) => !websiteId || site.id === websiteId);
    return sites.flatMap((site) =>
      (site.domains || []).map((domain) => ({
        ...domain,
        website_id: site.id,
        owner_id: ownerId,
      }))
    );
  }
  let query = requireClient().from("ss_domains").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (websiteId) query = query.eq("website_id", websiteId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listSubscriptions(ownerId) {
  if (isBootstrapOwner(ownerId)) return [];
  const { data, error } = await requireClient()
    .from("ss_subscriptions")
    .select("*, ss_plans(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listPayments(ownerId) {
  if (isBootstrapOwner(ownerId)) return [];
  const { data, error } = await requireClient()
    .from("ss_payments")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function startPlanCheckout({ ownerId, plan, returnUrl }) {
  const intent = await createCheckoutIntent({ plan, ownerId, returnUrl });
  const payment = {
    id: crypto.randomUUID(),
    owner_id: ownerId,
    amount_cents: (plan.price_cents || 0) + (plan.setup_fee_cents || 0),
    currency: plan.currency || "ZAR",
    status: intent.status || (intent.ok ? "pending" : "requires_configuration"),
    provider: intent.provider || "none",
    provider_ref: intent.providerRef || "",
    description: `Plan ${plan.name}`,
    metadata: { planId: plan.id, intent },
    created_at: new Date().toISOString(),
  };
  if (isBootstrapOwner(ownerId)) {
    return { ok: false, payment, intent };
  }
  const { data, error } = await requireClient().from("ss_payments").insert(payment).select("*").single();
  if (error) throw error;

  if (!intent.ok) {
    return { ok: false, payment: data, intent };
  }

  const { data: sub } = await requireClient()
    .from("ss_subscriptions")
    .insert({
      owner_id: ownerId,
      plan_id: plan.id,
      status: "incomplete",
      provider: intent.provider,
      provider_ref: intent.providerRef || "",
    })
    .select("*")
    .single();

  return { ok: true, payment: data, subscription: sub, intent };
}

export async function writeAudit(actorId, action, entityType, entityId, detail = {}) {
  if (!isRemote || !actorId || isBootstrapOwner(actorId)) return;
  await requireClient().from("ss_audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: String(entityId || ""),
    detail,
  });
}

export async function adminListCustomers() {
  if (loadBootstrapSession()) return [bootstrapProfile()];
  const { data, error } = await requireClient()
    .from("ss_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminListWebsites() {
  if (loadBootstrapSession()) {
    return loadLocalSites().map((site) => ({
      ...site,
      ss_profiles: { email: bootstrapProfile().email, full_name: bootstrapProfile().full_name },
    }));
  }
  const { data, error } = await requireClient()
    .from("ss_websites")
    .select("*, ss_profiles(email, full_name)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminSetCustomerStatus(userId, status, actorId) {
  if (loadBootstrapSession()) {
    return { ...bootstrapProfile(), id: userId, status };
  }
  const { data, error } = await requireClient()
    .from("ss_profiles")
    .update({ status })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit(actorId, "customer.status", "profile", userId, { status });
  return data;
}

export async function adminSuspendWebsite(websiteId, actorId) {
  const local = getLocalSite(websiteId);
  if (local) {
    const next = { ...local, status: "suspended", updated_at: new Date().toISOString() };
    upsertLocalSite(next);
    return next;
  }
  const { data, error } = await requireClient()
    .from("ss_websites")
    .update({ status: "suspended" })
    .eq("id", websiteId)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit(actorId, "website.suspend", "website", websiteId, {});
  return data;
}

export async function adminUpsertPlan(plan, actorId) {
  if (loadBootstrapSession()) return plan;
  const { data, error } = await requireClient()
    .from("ss_plans")
    .upsert(plan)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit(actorId, "plan.upsert", "plan", plan.id, { name: plan.name });
  return data;
}

export async function adminListAudit() {
  if (loadBootstrapSession()) return [];
  const { data, error } = await requireClient()
    .from("ss_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function createSupportRequest({ ownerId, subject, body }) {
  const { data, error } = await requireClient()
    .from("ss_support_requests")
    .insert({
      owner_id: ownerId,
      subject: sanitizeText(subject, { max: 160 }),
      body: sanitizeText(body, { max: 4000 }),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
