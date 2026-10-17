/**
 * In-memory "database" for the demo portal. Kept on globalThis so it survives
 * dev-server module reloads. Everything resets when the server restarts.
 */

export const DEMO_OTP = "123456";
export const DEMO_USER = "demo";

export const BUSINESS_TYPES = ["proprietorship", "partnership", "llp", "private_limited"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export interface BusinessDetails {
  business_type: BusinessType;
  business_name: string;
  activity_description: string;
  activity_code: string;
  pan: string;
}

export interface Enterprise {
  referenceNumber: string;
  owner: string;
  ownerName: string;
  details: BusinessDetails;
  address: string;
  mobile: string;
  status: "active" | "cancelled";
  certificateId: string;
  registeredAt: string;
}

interface OtpRequest {
  id: string;
  purpose: "registration" | "update";
  /** Aadhaar number (registration) or reference number (update). */
  subject: string;
  name?: string;
  verified: boolean;
}

interface Applicant {
  token: string;
  aadhaarNumber: string;
  name: string;
}

interface Draft {
  id: string;
  applicantToken: string;
  ownerName: string;
  details: BusinessDetails;
  submitted: boolean;
}

interface UpdateGrant {
  token: string;
  referenceNumber: string;
  used: boolean;
}

interface Store {
  seq: number;
  sessions: Set<string>;
  otpRequests: Map<string, OtpRequest>;
  applicants: Map<string, Applicant>;
  drafts: Map<string, Draft>;
  enterprises: Map<string, Enterprise>;
  updateGrants: Map<string, UpdateGrant>;
}

function freshStore(): Store {
  const store: Store = {
    seq: 1,
    sessions: new Set(),
    otpRequests: new Map(),
    applicants: new Map(),
    drafts: new Map(),
    enterprises: new Map(),
    updateGrants: new Map(),
  };
  // One registered enterprise for the demo user, so update/print/cancel can be tried right away.
  store.enterprises.set("DEMO-2026-000001", {
    referenceNumber: "DEMO-2026-000001",
    owner: DEMO_USER,
    ownerName: "Demo User",
    details: {
      business_type: "proprietorship",
      business_name: "Sunrise Tailoring",
      activity_description: "Tailoring and alterations",
      activity_code: "14101",
      pan: "ABCDE1234F",
    },
    address: "12 Market Road, Pune",
    mobile: "9876543210",
    status: "active",
    certificateId: "CERT-000001",
    registeredAt: "2026-01-15",
  });
  return store;
}

const globalForStore = globalThis as unknown as { __demoPortalStore?: Store };

export function db(): Store {
  globalForStore.__demoPortalStore ??= freshStore();
  return globalForStore.__demoPortalStore;
}

/** Tests only. */
export function resetStore(): void {
  globalForStore.__demoPortalStore = freshStore();
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nextReferenceNumber(): string {
  const store = db();
  store.seq += 1;
  return `DEMO-${new Date().getFullYear()}-${String(store.seq).padStart(6, "0")}`;
}
