import { Module } from "@nestjs/common";
import { ContactsModule } from "../contacts/contacts.module";
import { C6LeadsController } from "./c6-leads.controller";

@Module({
  imports: [ContactsModule],
  controllers: [C6LeadsController],
})
export class C6LeadsModule {}
