import { ConflictException } from "@nestjs/common";
import { C6LeadsController } from "../src/c6-leads/c6-leads.controller";

const contacts = {
  create: async (input: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    companyId?: string | null;
  }) => ({
    id: "contact_123",
    firstName: input.firstName,
    lastName: input.lastName ?? null,
  }),
};

const companies = {
  list: async () => ({ rows: [], total: 0, facetCounts: {} }),
  create: async () => ({ id: "company_123", name: "Acme", domain: null }),
};

describe("C6 lead webhook", () => {
  const originalSecret = process.env.C6_MAIL_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.C6_MAIL_WEBHOOK_SECRET = "test-secret";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.C6_MAIL_WEBHOOK_SECRET;
    else process.env.C6_MAIL_WEBHOOK_SECRET = originalSecret;
  });

  test("rejects an invalid secret", async () => {
    const controller = new C6LeadsController(companies as never, contacts as never);

    await expect(
      controller.ingest("wrong", {
        event: "lead.created",
        data: { contactName: "Test Lead", email: "test@example.com", companyName: "Acme" },
      }),
    ).rejects.toThrow("Invalid C6 event secret");
  });

  test("creates a contact from a C6 lead", async () => {
    const controller = new C6LeadsController(contacts as never);

    await expect(
      controller.ingest("test-secret", {
        event: "lead.created",
        data: {
          contactName: "Test Lead",
          email: "test@example.com",
          phone: "0100000000",
          companyName: "Acme",
        },
      }),
    ).resolves.toEqual({
      status: "created",
      contactId: "contact_123",
      source: "c6group.co.za",
    });
  });

  test("treats duplicate contacts as already captured", async () => {
    const duplicateContacts = {
      create: async () => {
        throw new ConflictException("A lead already exists.");
      },
    };
    const controller = new C6LeadsController(companies as never, duplicateContacts as never);

    await expect(
      controller.ingest("test-secret", {
        event: "lead.created",
        data: { firstName: "Test", email: "test@example.com" },
      }),
    ).resolves.toEqual({
      status: "already_exists",
      email: "test@example.com",
    });
  });
});
