import {
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { CompaniesService } from "../companies/companies.service";
import { ContactsService } from "../contacts/contacts.service";

interface C6LeadEvent {
  event: string;
  data?: {
    companyName?: string;
    industry?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    challenge?: string;
    [key: string]: unknown;
  };
}

function safeEqual(expected: string, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

function splitName(value: string): { firstName: string; lastName?: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

@Controller("internal/c6-leads")
export class C6LeadsController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly contacts: ContactsService,
  ) {}

  @Post()
  @HttpCode(202)
  async ingest(
    @Headers("x-c6-event-secret") secret: string | undefined,
    @Body() payload: C6LeadEvent,
  ) {
    const expected = process.env.C6_MAIL_WEBHOOK_SECRET ?? "";
    if (!safeEqual(expected, secret)) {
      throw new UnauthorizedException("Invalid C6 event secret");
    }

    if (payload?.event !== "lead.created") {
      return { status: "ignored", event: payload?.event ?? "unknown" };
    }

    const data = payload.data ?? {};
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const contactName =
      typeof data.contactName === "string" ? data.contactName.trim() : "";

    if (!email || !contactName) {
      return { status: "rejected", reason: "email_and_contactName_required" };
    }

    try {
      const { firstName, lastName } = splitName(contactName);
      const companyName =
        typeof data.companyName === "string" ? data.companyName.trim() : "";

      let companyId: string | undefined;
      if (companyName) {
        const existing = await this.companies.list({
          q: companyName,
          sort: "name",
          dir: "asc",
          page: 1,
          pageSize: 1,
          owner: [],
          industry: [],
          enrichment: [],
          source: [],
          activity: [],
          fields: {},
          archived: false,
        });
        companyId =
          existing.rows[0]?.name.toLowerCase() === companyName.toLowerCase()
            ? existing.rows[0].id
            : (await this.companies.create({ name: companyName })).id;
      }

      const contact = await this.contacts.create({
        firstName,
        lastName,
        email,
        phone: typeof data.phone === "string" ? data.phone.trim() : undefined,
        title: "C6 website lead",
        companyId: companyId ?? null,
      });

      return {
        status: "created",
        contactId: contact.id,
        companyId: companyId ?? null,
        source: "c6group.co.za",
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return { status: "already_exists", email };
      }
      throw error;
    }
  }
}
