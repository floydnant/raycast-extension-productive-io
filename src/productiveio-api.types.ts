export type TimeEntry = {
  id: string;
  type: "time_entries";
  attributes: {
    date: string;
    created_at: string;
    time: number;
    note: string | null;
    track_method_id: number;
    started_at: string | null;
    timer_started_at: string | null;
    timer_stopped_at: string | null;
    approved: boolean;
    approved_at: string | null;
    updated_at: string;
    calendar_event_id: string | null;
    invoice_attribution_id: string | null;
    invoiced: boolean;
    overhead: boolean;
    rejected: boolean;
    rejected_reason: string | null;
    rejected_at: string | null;
    last_activity_at: string;
    currency: string;
    currency_default: string;
    currency_normalized: string;
  };
  relationships: {
    organization: { data: { type: string; id: string } };
    person: { data: { type: string; id: string } };
    service: { data: { type: string; id: string } };
    task: { data: { type: string; id: string } | null };
    approver: { meta: { included: boolean } };
    updater: { meta: { included: boolean } };
    rejecter: { meta: { included: boolean } };
    creator: { meta: { included: boolean } };
    last_actor: { meta: { included: boolean } };
    person_subsidiary: { meta: { included: boolean } };
    deal_subsidiary: { meta: { included: boolean } };
  };
};

export type Service = {
  id: string;
  type: "services";
  attributes: {
    name: string;
    position: number;
    deleted_at: string;
    billable: boolean;
    description: string;
    time_tracking_enabled: boolean;
    expense_tracking_enabled: boolean;
    booking_tracking_enabled: boolean;
    origin_service_id: string;
    initial_service_id: string;
    budget_cap_enabled: boolean;
    editor_config: object;
    custom_fields: string;
  };
  relationships: {
    organization: { data: { type: string; id: string } };
    service_type: { meta: { included: boolean } };
    deal: { meta: { included: boolean } };
    person: { meta: { included: boolean } };
    section: { data: { type: string; id: string } };
    custom_field_people: { meta: { included: boolean } };
    custom_field_attachments: { meta: { included: boolean } };
  };
};

// @TODO: check this
export type Section = {
  id: string;
  type: "sections";
  attributes: {
    name: string;
    position: number;
    deleted_at: string;
    description: string;
    color: string;
    budget_cap_enabled: boolean;
    editor_config: object;
    custom_fields: string;
  };
  relationships: {
    organization: { data: { type: string; id: string } };
    deal: { meta: { included: boolean } };
    custom_field_people: { meta: { included: boolean } };
    custom_field_attachments: { meta: { included: boolean } };
  };
};

export type Timer = {
  id: string;
  type: "timers";
  attributes: {
    person_id: number;
    started_at: string;
    stopped_at: string | null;
    total_time: number;
  };
  relationships: {
    organization: { data: { type: string; id: string } };
    time_entry: { data: { type: "time_entries"; id: string } };
  };
};
