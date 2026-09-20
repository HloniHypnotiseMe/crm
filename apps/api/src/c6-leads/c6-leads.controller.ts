import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { ContactsService } from "../contacts/contacts.service";

interface C6LeadEvent {
  event: string;
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    website?: string;
    message?: string;
    source?: string;
    [key: string]: unknown;
  };
}

function safeEqual(expected: string, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Controller("internal/c6-leads")
export class C6LeadsController {
  constructor(private readonly contacts: ContactsService) {}

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
    const firstName =
      typeof data.firstName === "string" ? data.firstName.trim() : "";

    if (!email || !firstName) {
      return { status: "rejected", reason: "email_and_firstName_required" };
    }

    try {
      const contact = await this.contacts.create({
        firstName,
        lastName:
          typeof data.lastName === "string" ? data.lastName.trim() : undefined,
        email,
        phone: typeof data.phone === "string" ? data.phone.trim() : undefined,
        title: "C6 website lead",
      });

      return {
        status: "created",
        contactId: contact.id,
        source: "c6group.co.za",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already uses") || message.includes("already uses")) {
        return { status: "already_exists", email };
      }
      if (message.includes("already uses") || message.includes("already uses")) {
        return { status: "already_exists", email };
      }
      throw error;
    }
  }
}
