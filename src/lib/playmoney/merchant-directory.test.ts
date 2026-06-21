import { describe, it, expect } from "vitest";
import { matchMerchant, buildMerchantContact } from "./merchant-directory";

describe("matchMerchant", () => {
  it("matches TELUS*MOBILITY (asterisk-delimited txn format)", () => {
    const m = matchMerchant("TELUS*MOBILITY");
    expect(m).not.toBeNull();
    expect(m!.entry.slug).toBe("telus");
    expect(m!.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("matches NETFLIX.COM (dot-delimited)", () => {
    const m = matchMerchant("NETFLIX.COM");
    expect(m).not.toBeNull();
    expect(m!.entry.slug).toBe("netflix");
  });

  it("matches AMZN*MKTPLACE (Amazon abbreviation)", () => {
    const m = matchMerchant("AMZN*MKTPLACE");
    expect(m).not.toBeNull();
    expect(m!.entry.slug).toBe("amazon");
  });

  it("matches APPLE.COM/BILL (slash-path format)", () => {
    const m = matchMerchant("APPLE.COM/BILL");
    expect(m).not.toBeNull();
    expect(m!.entry.slug).toBe("apple");
  });

  it("matches ROGERS WIRELESS (space-delimited)", () => {
    const m = matchMerchant("ROGERS WIRELESS");
    expect(m).not.toBeNull();
    expect(m!.entry.slug).toBe("rogers");
  });

  it("matches ADOBE INC (exact name in description)", () => {
    const m = matchMerchant("ADOBE INC");
    expect(m).not.toBeNull();
    expect(m!.entry.slug).toBe("adobe");
  });

  it("returns null for unknown merchant", () => {
    const m = matchMerchant("XYZWIDGETS CORP 12345");
    expect(m).toBeNull();
  });

  it("is case-insensitive", () => {
    const upper = matchMerchant("SPOTIFY.COM");
    const lower = matchMerchant("spotify.com");
    expect(upper?.entry.slug).toBe("spotify");
    expect(lower?.entry.slug).toBe("spotify");
  });
});

describe("buildMerchantContact", () => {
  it("returns method:directory with url for a known merchant", () => {
    const contact = buildMerchantContact("NETFLIX.COM");
    expect(contact.method).toBe("directory");
    expect(contact.url).toContain("netflix");
  });

  it("returns method:manual with no email/url for unknown merchant", () => {
    const contact = buildMerchantContact("XYZWIDGETS CORP");
    expect(contact.method).toBe("manual");
    expect(contact.email).toBeUndefined();
    expect(contact.url).toBeUndefined();
  });

  it("returns email when directory entry has disputeEmail (Adobe)", () => {
    const contact = buildMerchantContact("ADOBE INC");
    expect(contact.method).toBe("directory");
    expect(contact.email).toBeDefined();
  });
});
