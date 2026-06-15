import type {
  ApiClient,
  AuthClient,
  Approval,
  Notification,
  OccupationContext,
  Profile,
  Recovery,
} from "./types";

// Cents helpers
const c = (dollars: number) => Math.round(dollars * 100);
const id = (p: string, n: number) => `${p}_${n.toString().padStart(4, "0")}`;

const NOW = new Date("2026-06-14T12:00:00Z").getTime();
const ago = (mins: number) => new Date(NOW - mins * 60_000).toISOString();

function seedRecoveries(): Recovery[] {
  const rows: Array<Omit<Recovery, "id" | "idempotencyKey" | "createdAt" | "updatedAt"> & { mins: number }> = [
    { merchant: "Chase Checking", avenue: "fee_reversal", reason: "Overdraft fee reversed", grossAmount: c(35), userNet: c(28), ourFee: c(7), status: "landed", mins: 60 * 26 },
    { merchant: "Uber", avenue: "double_charge", reason: "Duplicate ride charge", grossAmount: c(51.4), userNet: c(41.12), ourFee: c(10.28), status: "landed", mins: 60 * 50 },
    { merchant: "Spotify", avenue: "subscription", reason: "Unused 7 months — refund issued", grossAmount: c(83.93), userNet: c(67.14), ourFee: c(16.79), status: "on_the_way", mins: 60 * 4 },
    { merchant: "Delta Airlines", avenue: "refund", reason: "Delay compensation rule 240", grossAmount: c(240), userNet: c(192), ourFee: c(48), status: "needs_approval", mins: 60 * 2 },
    { merchant: "Comcast", avenue: "billing_error", reason: "Charged for cancelled line", grossAmount: c(118.62), userNet: c(94.9), ourFee: c(23.72), status: "needs_approval", mins: 30 },
    { merchant: "Amazon Prime", avenue: "subscription", reason: "Auto-renewed after cancel request", grossAmount: c(139), userNet: c(111.2), ourFee: c(27.8), status: "found", mins: 12 },
    { merchant: "Bank of America", avenue: "fee_reversal", reason: "Foreign transaction fee", grossAmount: c(8.7), userNet: c(6.96), ourFee: c(1.74), status: "found", mins: 6 },
    { merchant: "Adobe Creative Cloud", avenue: "refund", reason: "Promo pricing not honored", grossAmount: c(64.99), userNet: c(51.99), ourFee: c(13), status: "on_the_way", mins: 60 * 11 },
  ];
  return rows.map((r, i) => ({
    ...r,
    id: id("rec", i + 1),
    idempotencyKey: `idem_${i + 1}_${r.merchant.toLowerCase().replace(/\s+/g, "_")}`,
    createdAt: ago(r.mins),
    updatedAt: ago(r.mins),
  }));
}

const seededRecoveries = seedRecoveries();

const seededProfile: Profile = {
  id: "prof_001",
  displayName: "Maya Chen",
  email: "maya@example.com",
  payoutRef: "tok_payout_***z29x",
  identityVerified: true,
  createdAt: ago(60 * 24 * 30),
};

const seededNotifications: Notification[] = [
  { id: "ntf_1", type: "money_landed", recoveryId: "rec_0002", message: "$41.12 just landed from Uber", ts: ago(60 * 50), read: false },
  { id: "ntf_2", type: "needs_signature", recoveryId: "rec_0004", message: "Delta refund needs your OK ($192)", ts: ago(60 * 2), read: false },
  { id: "ntf_3", type: "money_landed", recoveryId: "rec_0001", message: "$28 just landed from Chase", ts: ago(60 * 26), read: true },
];

export class MockApiClient implements ApiClient {
  private recoveries = [...seededRecoveries];
  private approvals: Approval[] = [];
  private notifications = [...seededNotifications];

  async listRecoveries() {
    await this.delay();
    return [...this.recoveries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  async getRecovery(rid: string) {
    await this.delay();
    return this.recoveries.find((r) => r.id === rid) ?? null;
  }
  async approveRecovery({ recoveryId, idempotencyKey }: { recoveryId: string; idempotencyKey: string }) {
    await this.delay(220);
    const existing = this.approvals.find((a) => a.approvalToken === idempotencyKey);
    if (existing) return existing;
    const rec = this.recoveries.find((r) => r.id === recoveryId);
    if (!rec) throw new Error("Recovery not found");
    rec.status = "on_the_way";
    rec.updatedAt = new Date().toISOString();
    const approval: Approval = {
      id: id("apr", this.approvals.length + 1),
      recoveryId,
      approvalToken: idempotencyKey,
      approvedBy: seededProfile.id,
      ts: new Date().toISOString(),
    };
    this.approvals.push(approval);
    return approval;
  }
  async listNotifications() {
    await this.delay();
    return [...this.notifications];
  }
  async listFeeLedger() {
    await this.delay();
    return this.recoveries
      .filter((r) => r.status === "landed")
      .map((r, i) => ({ id: id("fee", i + 1), recoveryId: r.id, feeAmount: r.ourFee, ts: r.updatedAt }));
  }
  async totals() {
    await this.delay();
    const foundTotal = this.recoveries.reduce((s, r) => s + r.userNet, 0);
    const landedTotal = this.recoveries.filter((r) => r.status === "landed").reduce((s, r) => s + r.userNet, 0);
    const ourFeeTotal = this.recoveries.filter((r) => r.status === "landed").reduce((s, r) => s + r.ourFee, 0);
    return { foundTotal, landedTotal, ourFeeTotal };
  }
  async exportData() {
    return new Blob([JSON.stringify({ recoveries: this.recoveries }, null, 2)], { type: "application/json" });
  }
  async deleteAllData() {
    this.recoveries = [];
    this.notifications = [];
    this.approvals = [];
  }
  private delay(ms = 120) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export class MockAuthClient implements AuthClient {
  private profile: Profile | null = seededProfile;
  async getProfile() {
    return this.profile;
  }
  async signIn({ email }: { email: string }) {
    this.profile = { ...seededProfile, email };
    return this.profile;
  }
  async signOut() {
    this.profile = null;
  }
  async updateProfile(patch: Partial<Profile>) {
    this.profile = { ...(this.profile ?? seededProfile), ...patch };
    return this.profile;
  }
  async saveContext(context: OccupationContext): Promise<Profile> {
    this.profile = { ...(this.profile ?? seededProfile), context };
    return this.profile;
  }
}

// Singleton mock client boundary
export const api: ApiClient = new MockApiClient();
export const auth: AuthClient = new MockAuthClient();

// Live ticker seed (not stored; pure UI personality)
export const liveWins: Array<{ name: string; amount: number; reason: string }> = [
  { name: "Maya", amount: c(240), reason: "Delta delay refund" },
  { name: "Andre", amount: c(51), reason: "Double charge · Uber" },
  { name: "Priya", amount: c(118.62), reason: "Cancelled line · Comcast" },
  { name: "Jordan", amount: c(35), reason: "Overdraft fee · Chase" },
  { name: "Sofia", amount: c(83.93), reason: "Spotify unused" },
  { name: "Wes", amount: c(64.99), reason: "Adobe promo not honored" },
  { name: "Imani", amount: c(8.7), reason: "FX fee · BofA" },
  { name: "Theo", amount: c(139), reason: "Amazon auto-renew" },
  { name: "Riya", amount: c(22.5), reason: "Wrong ATM fee" },
  { name: "Luca", amount: c(76.4), reason: "Late delivery credit" },
];

export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}