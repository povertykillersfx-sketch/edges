import { supabase, isRemote } from "../../supabase.js";
import { BUILTIN_TEMPLATES, getBuiltinTemplate, mergeTemplateRow } from "./templates.js";
import { slugify, validateSlug, validateWebsiteConfig, validateUpload, sanitizeText } from "./validation.js";
import { createCheckoutIntent } from "./payments.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

export async function getSessionUser() {
  if (!isRemote) return null;
  const { data, error } = await requireClient().auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function signUp({ email, password, fullName }) {
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
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!isRemote) return;
  const { error } = await requireClient().auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const client = requireClient();
  const redirectTo = `${window.location.origin}/studio/reset`;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await requireClient().auth.updateUser({ password });
  if (error) throw error;
}

export async function fetchProfile(userId) {
  const { data, error } = await requireClient()
    .from("ss_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, patch) {
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

export async function listPlans() {
  if (!isRemote) {
    return [
      { id: "starter", name: "Starter", description: "One published site", price_cents: 29900, currency: "ZAR", billing_interval: "monthly", setup_fee_cents: 0, max_websites: 1, max_storage_mb: 100, custom_domain: false, features: ["1 website", "Subdomain publish"], active: true, sort_order: 1 },
      { id: "growth", name: "Growth", description: "Multiple sites + custom domain", price_cents: 69900, currency: "ZAR", billing_interval: "setup_monthly", setup_fee_cents: 150000, max_websites: 3, max_storage_mb: 500, custom_domain: true, features: ["3 websites", "Custom domain"], active: true, sort_order: 2 },
      { id: "agency", name: "Agency", description: "Agency limits", price_cents: 149900, currency: "ZAR", billing_interval: "setup_monthly", setup_fee_cents: 350000, max_websites: 15, max_storage_mb: 2048, custom_domain: true, features: ["15 websites", "Custom domains"], active: true, sort_order: 3 },
    ];
  }
  const { data, error } = await requireClient().from("ss_plans").select("*").eq("active", true).order("sort_order");
  if (error) throw error;
  return data || [];
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
  const { data, error } = await requireClient()
    .from("ss_websites")
    .select("*, ss_website_configs(draft, published, updated_at)")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getWebsite(websiteId) {
  const { data, error } = await requireClient()
    .from("ss_websites")
    .select("*, ss_website_configs(draft, published, updated_at)")
    .eq("id", websiteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPublishedBySlug(slug) {
  const clean = slugify(slug);
  if (!isRemote) return null;
  const { data: website, error } = await requireClient()
    .from("ss_websites")
    .select("*, ss_website_configs(published)")
    .eq("slug", clean)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return website;
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
  const { data, error } = await requireClient()
    .from("ss_domains")
    .insert({
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
    })
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit(ownerId, "domain.add", "domain", data.id, { hostname: host });
  return data;
}

export async function listDomains(ownerId, websiteId) {
  let query = requireClient().from("ss_domains").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (websiteId) query = query.eq("website_id", websiteId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listSubscriptions(ownerId) {
  const { data, error } = await requireClient()
    .from("ss_subscriptions")
    .select("*, ss_plans(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listPayments(ownerId) {
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
  const { data: payment, error } = await requireClient()
    .from("ss_payments")
    .insert({
      owner_id: ownerId,
      amount_cents: (plan.price_cents || 0) + (plan.setup_fee_cents || 0),
      currency: plan.currency || "ZAR",
      status: intent.status || (intent.ok ? "pending" : "requires_configuration"),
      provider: intent.provider || "none",
      provider_ref: intent.providerRef || "",
      description: `Plan ${plan.name}`,
      metadata: { planId: plan.id, intent },
    })
    .select("*")
    .single();
  if (error) throw error;

  if (!intent.ok) {
    return { ok: false, payment, intent };
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

  return { ok: true, payment, subscription: sub, intent };
}

export async function writeAudit(actorId, action, entityType, entityId, detail = {}) {
  if (!isRemote || !actorId) return;
  await requireClient().from("ss_audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: String(entityId || ""),
    detail,
  });
}

export async function adminListCustomers() {
  const { data, error } = await requireClient()
    .from("ss_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminListWebsites() {
  const { data, error } = await requireClient()
    .from("ss_websites")
    .select("*, ss_profiles(email, full_name)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminSetCustomerStatus(userId, status, actorId) {
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
