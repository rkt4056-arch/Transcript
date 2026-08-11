"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardPaste,
  Clock3,
  Edit3,
  Eye,
  FilePlus2,
  FileText,
  HelpCircle,
  History,
  Home as HomeIcon,
  Info,
  LayoutDashboard,
  ListChecks,
  MoreVertical,
  Plus,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

type TranscriptFormRow = {
  id: string;
  createdTime: string;
  payerType: string;
  name: string;
  businessName: string;
  product: string;
  flowType: string;
  transcriptStatus: string;
  comment: string;
  assignedTo: string;
};

type HistoryEntry = {
  id: string;
  occurredAt: string;
  timestamp: string;
  user: string;
  action: string;
  detail: string;
};

type DashboardTranscript = {
  id: string;
  createdTime: string;
  payerType: string;
  name: string;
  businessName: string;
  product: string;
  flowType: string;
  status: string;
  comment: string;
  priority: "Normal" | "High";
  assigned: string;
  updatedAt: string;
  updated: string;
  history: HistoryEntry[];
};

type UrgentAlert = {
  id: string;
  transcriptId: string;
  message: string;
  createdAt: string;
  timestamp: string;
  dismissed: boolean;
};

type AppRole = "Master Admin" | "Admin" | "Support" | "Reviewer";
type TeamRole = Exclude<AppRole, "Master Admin">;

type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  verified: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  role: TeamRole;
  invitedAt: string;
  verifiedAt?: string;
  invitationSent: boolean;
};

type TeamMemberForm = {
  name: string;
  email: string;
};

type InvitationForm = {
  password: string;
  confirmPassword: string;
};

type SummaryFilter = "total" | "completed" | "not-completed" | "monitoring-required";

type DashboardView =
  | { type: "dashboard" }
  | { type: "collection"; filter: SummaryFilter }
  | { type: "detail"; transcriptId: string }
  | { type: "team" }
  | { type: "invitation"; memberId: string };

type ActivityEntry = HistoryEntry & {
  transcriptId: string;
};

const transcriptFieldLabels: Record<keyof TranscriptFormRow, string> = {
  id: "ID",
  createdTime: "Created_time",
  payerType: "Payer Type",
  name: "Name",
  businessName: "Business Name",
  product: "Product",
  flowType: "Flow Type",
  transcriptStatus: "Transcript Status",
  comment: "Comment",
  assignedTo: "Assigned To",
};

const transcriptColumns = Object.values(transcriptFieldLabels);
const maxTranscriptBatch = 5;
const masterAdminAccount: AccountUser = {
  id: "master-admin",
  name: "Avery Brooks",
  email: "avery.brooks@firm.example",
  role: "Master Admin",
  verified: true,
};

const payerTypes = ["Individual", "Business", "Trust", "Estate"];
const productOptions = ["1040", "1065", "1120", "1120S", "941", "W-2"];
const flowTypeOptions = ["Monitoring", "New Request", "Refresh", "Follow-up"];
const priorityOptions: Array<DashboardTranscript["priority"]> = ["Normal", "High"];
const teamRoleOptions: TeamRole[] = ["Admin", "Support", "Reviewer"];
const transcriptStatusOptions = [
  "Pending",
  "Consent Submitted",
  "Consent Collected",
  "Consent Accepted by IRS",
  "Consent Rejected",
  "Consent Rejected by IRS",
  "Processing",
  "Completed",
];

const monitoringRequiredStatuses = new Set([
  "pending",
  "consent collected",
  "processing",
]);

const highPriorityStatusTransitions = new Set([
  "pending->consent collected",
  "consent submitted->consent collected",
  "consent submitted->pending",
  "consent collected->pending",
]);

const urgentReminderIntervalMs = 60 * 60 * 1000;

const statusColors: Record<string, string> = {
  Completed: "#18a23a",
  "Consent Accepted by IRS": "#0ea5a9",
  "Consent Collected": "#7048d8",
  "Consent Rejected": "#ef3349",
  "Consent Rejected by IRS": "#b20f16",
  "Consent Submitted": "#f47c20",
  Pending: "#f59e0b",
  Processing: "#3b82f6",
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Transcripts", icon: FileText },
  { label: "New Transcript", icon: FilePlus2 },
  { label: "Monitoring Queue", icon: ListChecks },
  { label: "Alerts", icon: Bell },
  { label: "Reports", icon: BarChart3 },
  { label: "Team", icon: UsersRound },
  { label: "Settings", icon: Settings },
];

const initialTeamMembers: TeamMember[] = [
  {
    id: "member-sarah-johnson",
    name: "Sarah Johnson",
    email: "sarah.johnson@firm.example",
    verified: true,
    role: "Admin",
    invitedAt: "Aug 10, 2026, 9:30 AM",
    verifiedAt: "Aug 10, 2026, 10:05 AM",
    invitationSent: true,
  },
  {
    id: "member-michael-brown",
    name: "Michael Brown",
    email: "michael.brown@firm.example",
    verified: true,
    role: "Reviewer",
    invitedAt: "Aug 10, 2026, 10:15 AM",
    verifiedAt: "Aug 10, 2026, 11:00 AM",
    invitationSent: true,
  },
  {
    id: "member-emily-davis",
    name: "Emily Davis",
    email: "emily.davis@firm.example",
    verified: false,
    role: "Support",
    invitedAt: "Aug 11, 2026, 8:45 AM",
    invitationSent: true,
  },
];

const filterTitles: Record<SummaryFilter, string> = {
  total: "All Transcripts",
  completed: "Completed Transcripts",
  "not-completed": "Not Completed Transcripts",
  "monitoring-required": "Monitoring Required",
};

function blankTranscriptRow(): TranscriptFormRow {
  return {
    id: "",
    createdTime: "",
    payerType: "Individual",
    name: "",
    businessName: "",
    product: "",
    flowType: "",
    transcriptStatus: "Pending",
    comment: "",
    assignedTo: "",
  };
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function isCompletedStatus(status: string) {
  return normalizeStatus(status) === "completed";
}

function isMonitoringRequiredStatus(status: string) {
  return monitoringRequiredStatuses.has(normalizeStatus(status));
}

function isHighPriorityStatusTransition(fromStatus: string, toStatus: string) {
  return highPriorityStatusTransitions.has(
    `${normalizeStatus(fromStatus)}->${normalizeStatus(toStatus)}`,
  );
}

function canManageTeam(role: AppRole) {
  return role === "Master Admin" || role === "Admin";
}

function canEditTranscript(role: AppRole) {
  return role === "Master Admin" || role === "Admin";
}

function canUpdateTranscriptStatus(role: AppRole) {
  return canEditTranscript(role) || role === "Reviewer";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

function validateTeamMemberForm(
  form: TeamMemberForm,
  existingMembers: TeamMember[],
) {
  const errors: string[] = [];
  const email = normalizeEmail(form.email);

  if (!form.name.trim()) {
    errors.push("Member User name is required.");
  }

  if (!form.email.trim()) {
    errors.push("Email is required.");
  } else if (!isValidEmail(form.email)) {
    errors.push("Enter a valid email address.");
  }

  const existingEmails = new Set([
    normalizeEmail(masterAdminAccount.email),
    ...existingMembers.map((member) => normalizeEmail(member.email)),
  ]);

  if (email && existingEmails.has(email)) {
    errors.push("A team member with this email already exists.");
  }

  return errors;
}

function validateInvitationForm(form: InvitationForm) {
  const errors: string[] = [];

  if (!form.password.trim()) {
    errors.push("Password is required.");
  } else if (form.password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  if (!form.confirmPassword.trim()) {
    errors.push("Confirm password is required.");
  } else if (form.password !== form.confirmPassword) {
    errors.push("Passwords must match.");
  }

  return errors;
}

function getCanonicalStatus(status: string) {
  const normalizedStatus = normalizeStatus(status);

  return (
    transcriptStatusOptions.find(
      (statusOption) => normalizeStatus(statusOption) === normalizedStatus,
    ) ?? status.trim()
  );
}

function splitBulkLine(line: string) {
  return line.includes("\t")
    ? line.split("\t")
    : line.split(",").map((part) => part.trim());
}

function parseBulkTranscriptRows(text: string): TranscriptFormRow[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitBulkLine);

  const normalizedHeader = rows[0]?.map((item) =>
    item.toLowerCase().replace(/[\s_]+/g, ""),
  );
  const hasHeader =
    normalizedHeader?.includes("id") &&
    normalizedHeader?.includes("createdtime");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((cells) => ({
    id: cells[0]?.trim() ?? "",
    createdTime: cells[1]?.trim() ?? "",
    payerType: cells[2]?.trim() || "Individual",
    name: cells[3]?.trim() ?? "",
    businessName: cells[4]?.trim() ?? "",
    product: cells[5]?.trim() ?? "",
    flowType: cells[6]?.trim() ?? "",
    transcriptStatus: cells[7]?.trim() || "Pending",
    comment: cells[8]?.trim() ?? "",
    assignedTo: cells[9]?.trim() ?? "",
  }));
}

function validateTranscriptRows(
  rows: TranscriptFormRow[],
  existingIds: Set<string>,
  editingTranscriptId: string | null,
) {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  if (rows.length === 0) {
    errors.push("Add at least 1 transcript.");
  }

  if (rows.length > maxTranscriptBatch) {
    errors.push("Maximum 5 transcripts can be added at a time.");
  }

  rows.slice(0, maxTranscriptBatch).forEach((row, index) => {
    const rowNumber = index + 1;
    const requiredFields: Array<keyof TranscriptFormRow> = [
      "id",
      "createdTime",
      "payerType",
      "product",
      "flowType",
      "transcriptStatus",
      "assignedTo",
    ];

    requiredFields.forEach((field) => {
      if (!row[field].trim()) {
        errors.push(`Row ${rowNumber}: ${transcriptFieldLabels[field]} is required.`);
      }
    });

    if (
      row.transcriptStatus.trim() &&
      !transcriptStatusOptions.some(
        (status) => normalizeStatus(status) === normalizeStatus(row.transcriptStatus),
      )
    ) {
      errors.push(`Row ${rowNumber}: Transcript Status is not supported.`);
    }

    if (!row.name.trim() && !row.businessName.trim()) {
      errors.push(`Row ${rowNumber}: Name or Business Name is required.`);
    }

    const normalizedId = row.id.trim().toLowerCase();

    if (!normalizedId) {
      return;
    }

    if (seenIds.has(normalizedId)) {
      errors.push(`Row ${rowNumber}: Transcript ID is duplicated in this batch.`);
    }

    seenIds.add(normalizedId);

    if (
      existingIds.has(normalizedId) &&
      normalizedId !== editingTranscriptId?.trim().toLowerCase()
    ) {
      errors.push(`Row ${rowNumber}: Transcript ID already exists.`);
    }
  });

  return errors;
}

function parseTranscriptDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRequestedDate(value: string) {
  const parsed = parseTranscriptDate(value);

  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatTimestamp(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getTranscriptAge(createdTime: string) {
  const parsed = parseTranscriptDate(createdTime);

  if (!parsed) {
    return "Unknown";
  }

  const dayInMs = 24 * 60 * 60 * 1000;
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - parsed.getTime()) / dayInMs),
  );

  return `${ageDays} day${ageDays === 1 ? "" : "s"}`;
}

function getTaxpayer(transcript: Pick<DashboardTranscript, "name" | "businessName">) {
  return transcript.name.trim() || transcript.businessName.trim();
}

function makeHistoryEntry(
  action: string,
  detail: string,
  userName: string,
): HistoryEntry {
  const occurredAt = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt,
    timestamp: formatTimestamp(occurredAt),
    user: userName,
    action,
    detail,
  };
}

function makeUrgentTranscriptAlert(
  transcriptId: string,
  message: string,
): UrgentAlert {
  const createdAt = new Date().toISOString();

  return {
    id: `urgent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    transcriptId,
    message,
    createdAt,
    timestamp: formatTimestamp(createdAt),
    dismissed: false,
  };
}

function toDashboardTranscript(
  row: TranscriptFormRow,
  source: "bulk" | "manual",
  userName: string,
): DashboardTranscript {
  const now = new Date().toISOString();
  const status = getCanonicalStatus(row.transcriptStatus) || "Pending";

  return {
    id: row.id.trim(),
    createdTime: row.createdTime.trim(),
    payerType: row.payerType.trim(),
    name: row.name.trim(),
    businessName: row.businessName.trim(),
    product: row.product.trim(),
    flowType: row.flowType.trim(),
    status,
    comment: row.comment.trim(),
    priority: "Normal",
    assigned: row.assignedTo.trim(),
    updatedAt: now,
    updated: formatTimestamp(now),
    history: [
      makeHistoryEntry(
        "Transcript added",
        `Added from ${source === "bulk" ? "bulk paste" : "manual"} entry with ${status} status.`,
        userName,
      ),
    ],
  };
}

function toTranscriptFormRow(transcript: DashboardTranscript): TranscriptFormRow {
  return {
    id: transcript.id,
    createdTime: transcript.createdTime,
    payerType: transcript.payerType,
    name: transcript.name,
    businessName: transcript.businessName,
    product: transcript.product,
    flowType: transcript.flowType,
    transcriptStatus: transcript.status,
    comment: transcript.comment,
    assignedTo: transcript.assigned,
  };
}

function getStatusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function getPercent(value: number, total: number) {
  return total === 0 ? "0.0%" : `${((value / total) * 100).toFixed(1)}%`;
}

function buildDonutGradient(items: Array<{ value: number; color: string }>, total: number) {
  if (total === 0) {
    return "conic-gradient(#edf2f7 0 100%)";
  }

  let offset = 0;
  const stops = items
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = offset;
      offset += (item.value / total) * 100;
      return `${item.color} ${start}% ${offset}%`;
    });

  return `conic-gradient(${stops.join(", ")})`;
}

export default function DashboardHome() {
  const [records, setRecords] = useState<DashboardTranscript[]>([]);
  const [teamMembers, setTeamMembers] =
    useState<TeamMember[]>(initialTeamMembers);
  const [currentUserId, setCurrentUserId] = useState(masterAdminAccount.id);
  const [view, setView] = useState<DashboardView>({ type: "dashboard" });
  const [detailReturnFilter, setDetailReturnFilter] =
    useState<SummaryFilter | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<"bulk" | "manual">("bulk");
  const [manualRows, setManualRows] = useState<TranscriptFormRow[]>([
    blankTranscriptRow(),
  ]);
  const [teamForm, setTeamForm] = useState<TeamMemberForm>({
    name: "",
    email: "",
  });
  const [invitationForm, setInvitationForm] = useState<InvitationForm>({
    password: "",
    confirmPassword: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [teamSubmitAttempted, setTeamSubmitAttempted] = useState(false);
  const [invitationSubmitAttempted, setInvitationSubmitAttempted] =
    useState(false);
  const [addMessage, setAddMessage] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlert[]>([]);

  const verifiedTeamUsers: AccountUser[] = teamMembers
    .filter((member) => member.verified)
    .map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      verified: member.verified,
    }));
  const availableUsers = [masterAdminAccount, ...verifiedTeamUsers];
  const currentUser =
    availableUsers.find((user) => user.id === currentUserId) ?? masterAdminAccount;
  const canManageTeamNow = canManageTeam(currentUser.role);
  const canEditTranscriptNow = canEditTranscript(currentUser.role);
  const canUpdateStatusNow = canUpdateTranscriptStatus(currentUser.role);

  const parsedBulkRows = useMemo(() => parseBulkTranscriptRows(bulkText), [bulkText]);
  const activeRows = editingTranscriptId
    ? manualRows.slice(0, 1)
    : entryMode === "bulk"
      ? parsedBulkRows
      : manualRows;
  const existingTranscriptIds = useMemo(
    () => new Set(records.map((record) => record.id.toLowerCase())),
    [records],
  );
  const validationErrors = useMemo(
    () =>
      validateTranscriptRows(activeRows, existingTranscriptIds, editingTranscriptId),
    [activeRows, existingTranscriptIds, editingTranscriptId],
  );
  const teamValidationErrors = useMemo(
    () => validateTeamMemberForm(teamForm, teamMembers),
    [teamForm, teamMembers],
  );
  const invitationValidationErrors = useMemo(
    () => validateInvitationForm(invitationForm),
    [invitationForm],
  );
  const previewRows = activeRows.slice(0, maxTranscriptBatch);
  const visibleValidationErrors =
    submitAttempted || activeRows.length > maxTranscriptBatch ? validationErrors : [];
  const visibleTeamErrors = teamSubmitAttempted ? teamValidationErrors : [];
  const visibleInvitationErrors = invitationSubmitAttempted
    ? invitationValidationErrors
    : [];

  const completedCount = records.filter((record) =>
    isCompletedStatus(record.status),
  ).length;
  const notCompletedCount = records.length - completedCount;
  const monitoringRequiredCount = records.filter((record) =>
    isMonitoringRequiredStatus(record.status),
  ).length;

  const dashboardSummaryCards = [
    {
      label: "Total Transcript",
      value: String(records.length),
      caption: "All time",
      tone: "blue",
      icon: FileText,
      filter: "total" as const,
    },
    {
      label: "Completed",
      value: String(completedCount),
      caption: `${getPercent(completedCount, records.length)} of total`,
      tone: "green",
      icon: CheckCircle2,
      filter: "completed" as const,
    },
    {
      label: "Not Completed",
      value: String(notCompletedCount),
      caption: `${getPercent(notCompletedCount, records.length)} of total`,
      tone: "blue",
      icon: Clock3,
      filter: "not-completed" as const,
    },
    {
      label: "Monitoring Required",
      value: String(monitoringRequiredCount),
      caption: `${getPercent(monitoringRequiredCount, records.length)} of total`,
      tone: "orange",
      icon: TriangleAlert,
      filter: "monitoring-required" as const,
    },
  ];

  const statusItems = transcriptStatusOptions.map((status) => {
    const value = records.filter(
      (record) => normalizeStatus(record.status) === normalizeStatus(status),
    ).length;

    return {
      label: status,
      value,
      percent: getPercent(value, records.length),
      color: statusColors[status] ?? "#64748b",
    };
  });

  const recentActivity = useMemo(
    () =>
      records
        .flatMap((record) =>
          record.history.map((entry) => ({
            ...entry,
            transcriptId: record.id,
          })),
        )
        .sort(
          (first, second) =>
            new Date(second.occurredAt).getTime() -
            new Date(first.occurredAt).getTime(),
        )
        .slice(0, 5),
    [records],
  );
  const activeUrgentAlerts = useMemo(
    () =>
      urgentAlerts
        .filter((alert) => !alert.dismissed)
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
    [urgentAlerts],
  );
  const notificationCount = recentActivity.length + activeUrgentAlerts.length;

  const updatedTodayCount = records.filter((record) => {
    const updated = new Date(record.updatedAt);
    const today = new Date();

    return (
      updated.getFullYear() === today.getFullYear() &&
      updated.getMonth() === today.getMonth() &&
      updated.getDate() === today.getDate()
    );
  }).length;

  const selectedTranscript =
    view.type === "detail"
      ? records.find((record) => record.id === view.transcriptId)
      : undefined;
  const selectedInvitationMember =
    view.type === "invitation"
      ? teamMembers.find((member) => member.id === view.memberId)
      : undefined;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const highPriorityRecords = records.filter(
        (record) =>
          record.priority === "High" && !isCompletedStatus(record.status),
      );

      if (highPriorityRecords.length === 0) {
        return;
      }

      setUrgentAlerts((currentAlerts) => {
        const openTranscriptIds = new Set(
          currentAlerts
            .filter((alert) => !alert.dismissed)
            .map((alert) => alert.transcriptId),
        );
        const reminderAlerts = highPriorityRecords
          .filter((record) => !openTranscriptIds.has(record.id))
          .map((record) =>
            makeUrgentTranscriptAlert(
              record.id,
              `${record.id} remains High priority. Review it and cross out this reminder after manual check.`,
            ),
          );

        return reminderAlerts.length === 0
          ? currentAlerts
          : [...reminderAlerts, ...currentAlerts].slice(0, 40);
      });
    }, urgentReminderIntervalMs);

    return () => window.clearInterval(timer);
  }, [records]);

  function getFilteredRecords(filter: SummaryFilter) {
    if (filter === "completed") {
      return records.filter((record) => isCompletedStatus(record.status));
    }

    if (filter === "not-completed") {
      return records.filter((record) => !isCompletedStatus(record.status));
    }

    if (filter === "monitoring-required") {
      return records.filter((record) => isMonitoringRequiredStatus(record.status));
    }

    return records;
  }

  function openTranscriptModal(transcript?: DashboardTranscript) {
    if (transcript && !canEditTranscriptNow) {
      setAddMessage("Your role can view transcripts but cannot edit existing details.");
      setOpenActionId(null);
      return;
    }

    setSubmitAttempted(false);
    setAddMessage("");
    setOpenActionId(null);

    if (transcript) {
      setEditingTranscriptId(transcript.id);
      setEntryMode("manual");
      setManualRows([toTranscriptFormRow(transcript)]);
      setBulkText("");
    } else {
      setEditingTranscriptId(null);
      setEntryMode("bulk");
      setManualRows([blankTranscriptRow()]);
    }

    setIsTranscriptModalOpen(true);
  }

  function closeTranscriptModal() {
    setIsTranscriptModalOpen(false);
    setEditingTranscriptId(null);
    setSubmitAttempted(false);
  }

  function openCollection(filter: SummaryFilter) {
    setOpenActionId(null);
    setView({ type: "collection", filter });
  }

  function openTranscriptDetail(id: string, returnFilter?: SummaryFilter | null) {
    setOpenActionId(null);
    setDetailReturnFilter(returnFilter ?? null);
    setView({ type: "detail", transcriptId: id });
  }

  function returnFromDetail() {
    if (detailReturnFilter) {
      setView({ type: "collection", filter: detailReturnFilter });
      return;
    }

    setView({ type: "dashboard" });
  }

  function updateManualRow(
    index: number,
    field: keyof TranscriptFormRow,
    value: string,
  ) {
    setManualRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function addManualRow() {
    setManualRows((rows) =>
      rows.length >= maxTranscriptBatch ? rows : [...rows, blankTranscriptRow()],
    );
  }

  function removeManualRow(index: number) {
    setManualRows((rows) =>
      rows.length === 1 ? [blankTranscriptRow()] : rows.filter((_, i) => i !== index),
    );
  }

  function appendHistory(
    transcript: DashboardTranscript,
    action: string,
    detail: string,
  ) {
    const now = new Date().toISOString();

    return {
      ...transcript,
      updatedAt: now,
      updated: formatTimestamp(now),
      history: [
        ...transcript.history,
        makeHistoryEntry(action, detail, currentUser.name),
      ],
    };
  }

  function addUrgentAlert(
    transcriptId: string,
    fromStatus: string,
    toStatus: string,
  ) {
    setUrgentAlerts((currentAlerts) => [
      makeUrgentTranscriptAlert(
        transcriptId,
        `${transcriptId} changed from ${fromStatus} to ${toStatus}. Review it and cross out this alert after manual check.`,
      ),
      ...currentAlerts,
    ].slice(0, 40));
  }

  function addManualHighPriorityAlert(transcriptId: string) {
    setUrgentAlerts((currentAlerts) => [
      makeUrgentTranscriptAlert(
        transcriptId,
        `${transcriptId} was marked High priority. Review it and cross out this alert after manual check.`,
      ),
      ...currentAlerts,
    ].slice(0, 40));
  }

  function dismissUrgentAlert(alertId: string) {
    setUrgentAlerts((currentAlerts) =>
      currentAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, dismissed: true } : alert,
      ),
    );
  }

  function submitTranscripts() {
    setSubmitAttempted(true);

    if (validationErrors.length > 0) {
      return;
    }

    if (editingTranscriptId) {
      if (!canEditTranscriptNow) {
        setAddMessage("Your role can view transcripts but cannot edit existing details.");
        setIsTranscriptModalOpen(false);
        setEditingTranscriptId(null);
        return;
      }

      const editedRow = activeRows[0];
      const editedStatus = getCanonicalStatus(editedRow.transcriptStatus);
      const previousRecord = records.find(
        (record) => record.id === editingTranscriptId,
      );
      const shouldMarkHigh =
        previousRecord &&
        isHighPriorityStatusTransition(previousRecord.status, editedStatus);

      setRecords((currentRecords) =>
        currentRecords.map((record) => {
          if (record.id !== editingTranscriptId) {
            return record;
          }

          const oldStatus = record.status;
          const updatedRecord: DashboardTranscript = {
            ...record,
            id: editedRow.id.trim(),
            createdTime: editedRow.createdTime.trim(),
            payerType: editedRow.payerType.trim(),
            name: editedRow.name.trim(),
            businessName: editedRow.businessName.trim(),
            product: editedRow.product.trim(),
            flowType: editedRow.flowType.trim(),
            status: editedStatus,
            comment: editedRow.comment.trim(),
            priority: shouldMarkHigh ? "High" : record.priority,
            assigned: editedRow.assignedTo.trim(),
          };
          const detail =
            oldStatus === updatedRecord.status
              ? "Transcript uploaded details were edited."
              : `Transcript details were edited and status changed from ${oldStatus} to ${updatedRecord.status}.${
                  shouldMarkHigh
                    ? " Marked High priority because this transition requires monitoring."
                    : ""
                }`;

          return appendHistory(updatedRecord, "Transcript edited", detail);
        }),
      );

      if (shouldMarkHigh && previousRecord) {
        addUrgentAlert(editedRow.id.trim(), previousRecord.status, editedStatus);
      }

      setAddMessage("Transcript details updated.");
      setView({ type: "detail", transcriptId: editedRow.id.trim() });
    } else {
      const newRecords = activeRows
        .slice(0, maxTranscriptBatch)
        .map((row) => toDashboardTranscript(row, entryMode, currentUser.name));

      setRecords((currentRecords) => [...newRecords, ...currentRecords]);
      setAddMessage(
        `${newRecords.length} transcript${
          newRecords.length === 1 ? "" : "s"
        } added to the monitoring queue.`,
      );
      setBulkText("");
      setManualRows([blankTranscriptRow()]);
    }

    setIsTranscriptModalOpen(false);
    setEditingTranscriptId(null);
    setSubmitAttempted(false);
  }

  function updateTranscriptStatus(id: string, nextStatus: string) {
    if (!canUpdateStatusNow) {
      setAddMessage("Your role cannot update transcript status.");
      setOpenActionId(null);
      return;
    }

    const canonicalNextStatus = getCanonicalStatus(nextStatus);
    const currentRecord = records.find((record) => record.id === id);
    const shouldMarkHigh =
      currentRecord &&
      currentRecord.status !== canonicalNextStatus &&
      isHighPriorityStatusTransition(currentRecord.status, canonicalNextStatus);

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== id || record.status === canonicalNextStatus) {
          return record;
        }

        return appendHistory(
          {
            ...record,
            status: canonicalNextStatus,
            priority: shouldMarkHigh ? "High" : record.priority,
          },
          "Status updated",
          `Status changed from ${record.status} to ${canonicalNextStatus}.${
            shouldMarkHigh
              ? " Marked High priority because this transition requires monitoring."
              : ""
          }`,
        );
      }),
    );

    if (shouldMarkHigh && currentRecord) {
      addUrgentAlert(id, currentRecord.status, canonicalNextStatus);
    }

    setOpenActionId(null);
  }

  function updateTranscriptPriority(
    id: string,
    nextPriority: DashboardTranscript["priority"],
  ) {
    if (!canEditTranscriptNow) {
      setAddMessage("Your role cannot update transcript priority.");
      setOpenActionId(null);
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== id || record.priority === nextPriority) {
          return record;
        }

        return appendHistory(
          { ...record, priority: nextPriority },
          "Priority updated",
          `Priority changed from ${record.priority} to ${nextPriority}.`,
        );
      }),
    );

    if (nextPriority === "High") {
      addManualHighPriorityAlert(id);
    }

    setOpenActionId(null);
  }

  function updateTranscriptComment(id: string, nextComment: string) {
    if (!canEditTranscriptNow) {
      setAddMessage("Your role can view comments but cannot edit them.");
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== id || record.comment === nextComment.trim()) {
          return record;
        }

        return appendHistory(
          { ...record, comment: nextComment.trim() },
          "Comment updated",
          "Transcript comment was updated.",
        );
      }),
    );
    setCommentDrafts((drafts) => {
      const nextDrafts = { ...drafts };
      delete nextDrafts[id];
      return nextDrafts;
    });
  }

  function deleteTranscript(id: string) {
    if (!canEditTranscriptNow) {
      setAddMessage("Your role cannot delete transcript records.");
      setOpenActionId(null);
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== id),
    );
    setOpenActionId(null);

    if (view.type === "detail" && view.transcriptId === id) {
      setView({ type: "dashboard" });
    }
  }

  function openTeamModal() {
    if (!canManageTeamNow) {
      setTeamMessage("Your role cannot manage Team users.");
      return;
    }

    setTeamForm({ name: "", email: "" });
    setTeamSubmitAttempted(false);
    setTeamMessage("");
    setIsTeamModalOpen(true);
  }

  function closeTeamModal() {
    setIsTeamModalOpen(false);
    setTeamSubmitAttempted(false);
  }

  function submitTeamMember() {
    setTeamSubmitAttempted(true);

    if (!canManageTeamNow) {
      setTeamMessage("Your role cannot manage Team users.");
      setIsTeamModalOpen(false);
      return;
    }

    if (teamValidationErrors.length > 0) {
      return;
    }

    const now = new Date().toISOString();
    const email = normalizeEmail(teamForm.email);

    setTeamMembers((members) => [
      {
        id: `member-${Date.now()}`,
        name: teamForm.name.trim(),
        email,
        verified: false,
        role: "Support",
        invitedAt: formatTimestamp(now),
        invitationSent: true,
      },
      ...members,
    ]);
    setTeamMessage(
      `Invitation sent to ${email}. The member remains pending until account creation is complete.`,
    );
    setIsTeamModalOpen(false);
    setTeamSubmitAttempted(false);
    setTeamForm({ name: "", email: "" });
  }

  function openInvitation(memberId: string) {
    setInvitationForm({ password: "", confirmPassword: "" });
    setInvitationSubmitAttempted(false);
    setTeamMessage("");
    setView({ type: "invitation", memberId });
  }

  function acceptInvitation(member: TeamMember) {
    setInvitationSubmitAttempted(true);

    if (invitationValidationErrors.length > 0) {
      return;
    }

    const now = new Date().toISOString();

    setTeamMembers((members) =>
      members.map((currentMember) =>
        currentMember.id === member.id
          ? {
              ...currentMember,
              verified: true,
              verifiedAt: formatTimestamp(now),
            }
          : currentMember,
      ),
    );
    setCurrentUserId(member.id);
    setAddMessage(`${member.name} account created and signed in successfully.`);
    setView({ type: "dashboard" });
    setInvitationForm({ password: "", confirmPassword: "" });
    setInvitationSubmitAttempted(false);
  }

  function updateMemberRole(memberId: string, role: TeamRole) {
    if (!canManageTeamNow) {
      setTeamMessage("Your role cannot manage Team users.");
      return;
    }

    setTeamMembers((members) =>
      members.map((member) =>
        member.id === memberId && member.verified
          ? { ...member, role }
          : member,
      ),
    );
    setTeamMessage("Member rights updated.");
  }

  function handleCurrentUserChange(nextUserId: string) {
    const nextUser =
      availableUsers.find((user) => user.id === nextUserId) ?? masterAdminAccount;

    setCurrentUserId(nextUser.id);
    setOpenActionId(null);

    if (!canManageTeam(nextUser.role) && view.type === "team") {
      setView({ type: "dashboard" });
    }
  }

  function getNavActive(label: string) {
    if (label === "Dashboard") {
      return view.type === "dashboard";
    }

    if (label === "Transcripts") {
      return view.type === "collection" && view.filter === "total";
    }

    if (label === "Monitoring Queue") {
      return view.type === "collection" && view.filter === "monitoring-required";
    }

    if (label === "Team") {
      return view.type === "team";
    }

    return false;
  }

  function handleNavClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    label: string,
  ) {
    event.preventDefault();

    if (label === "Dashboard") {
      setView({ type: "dashboard" });
      return;
    }

    if (label === "Transcripts") {
      openCollection("total");
      return;
    }

    if (label === "New Transcript") {
      openTranscriptModal();
      return;
    }

    if (label === "Monitoring Queue") {
      openCollection("monitoring-required");
      return;
    }

    if (label === "Team" && canManageTeamNow) {
      setView({ type: "team" });
    }
  }

  function renderActionMenu(
    row: DashboardTranscript,
    returnFilter?: SummaryFilter | null,
  ) {
    const isOpen = openActionId === row.id;

    return (
      <div className="action-menu-wrap">
        <button
          className="action-trigger"
          type="button"
          aria-expanded={isOpen}
          aria-label="Open row actions"
          onClick={() => setOpenActionId(isOpen ? null : row.id)}
        >
          <span>Actions</span>
          <MoreVertical size={15} />
        </button>

        {isOpen && (
          <div className="action-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => openTranscriptDetail(row.id, returnFilter)}
            >
              <Eye size={15} />
              <span>View</span>
            </button>

            {canUpdateStatusNow ? (
              <label>
                <span>Update Status</span>
                <select
                  value={row.status}
                  onChange={(event) =>
                    updateTranscriptStatus(row.id, event.target.value)
                  }
                >
                  {transcriptStatusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="permission-denied">Status update unavailable</p>
            )}

            {canEditTranscriptNow ? (
              <>
                <label>
                  <span>Update Priority</span>
                  <select
                    value={row.priority}
                    onChange={(event) =>
                      updateTranscriptPriority(
                        row.id,
                        event.target.value as DashboardTranscript["priority"],
                      )
                    }
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openTranscriptModal(row)}
                >
                  <Edit3 size={15} />
                  <span>Edit</span>
                </button>

                <button
                  className="danger-action"
                  type="button"
                  role="menuitem"
                  onClick={() => deleteTranscript(row.id)}
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
              </>
            ) : (
              <p className="permission-denied">Editing unavailable</p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderTranscriptTable(
    tableRecords: DashboardTranscript[],
    options?: { returnFilter?: SummaryFilter | null; emptyText?: string },
  ) {
    return (
      <>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transcript ID</th>
                <th>Taxpayer</th>
                <th>Requested Date</th>
                <th>Current Status</th>
                <th>Age</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tableRecords.length > 0 ? (
                tableRecords.map((row) => (
                  <tr
                    className={row.priority === "High" ? "urgent-row" : ""}
                    key={row.id}
                  >
                    <td>
                      <button
                        className="link-button"
                        type="button"
                        onClick={() =>
                          openTranscriptDetail(row.id, options?.returnFilter)
                        }
                      >
                        {row.id}
                      </button>
                    </td>
                    <td>{getTaxpayer(row)}</td>
                    <td>{formatRequestedDate(row.createdTime)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td
                      className={row.priority === "High" ? "danger-text" : ""}
                    >
                      {getTranscriptAge(row.createdTime)}
                    </td>
                    <td>
                      <span
                        className={`priority-badge ${
                          row.priority === "High" ? "high" : ""
                        }`}
                      >
                        {row.priority === "High" && <ShieldAlert size={13} />}
                        {row.priority}
                      </span>
                    </td>
                    <td>{row.assigned}</td>
                    <td
                      className={row.priority === "High" ? "danger-text" : ""}
                    >
                      {row.updated}
                    </td>
                    <td>{renderActionMenu(row, options?.returnFilter)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-table-cell" colSpan={9}>
                    {options?.emptyText ??
                      "No transcripts added yet. Use New Transcript to add records."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="table-footer">
          <span>
            Showing {tableRecords.length === 0 ? 0 : 1} to{" "}
            {Math.min(tableRecords.length, 10)} of {tableRecords.length} records
          </span>
          <div className="pagination" aria-label="Pagination">
            <button type="button" aria-label="Previous page">
              <ChevronLeft size={17} />
            </button>
            <button className="active" type="button">
              1
            </button>
            <button type="button">2</button>
            <button type="button">3</button>
            <span>...</span>
            <button type="button">25</button>
            <button type="button" aria-label="Next page">
              <ChevronRight size={17} />
            </button>
            <select aria-label="Rows per page" defaultValue="10 / page">
              <option>10 / page</option>
              <option>25 / page</option>
              <option>50 / page</option>
            </select>
          </div>
        </footer>
      </>
    );
  }

  function renderFilters() {
    return (
      <div className="filters" aria-label="Transcript filters">
        <label>
          <span className="sr-only">Status</span>
          <select defaultValue="All Statuses">
            <option>All Statuses</option>
            {transcriptStatusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Priority</span>
          <select defaultValue="Priority">
            <option>Priority</option>
            {priorityOptions.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Assigned to</span>
          <select defaultValue="Assigned To">
            <option>Assigned To</option>
            {availableUsers.map((user) => (
              <option key={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
        <label className="date-filter">
          <CalendarDays size={16} />
          <span>05/01/2024 - 05/31/2024</span>
          <ChevronDown size={16} />
        </label>
        <button className="clear-button" type="button">
          <X size={16} />
          <span>Clear Filters</span>
        </button>
      </div>
    );
  }

  function renderDashboardContent() {
    return (
      <>
        <div className="intro-row">
          <div className="notice-bar" role="status">
            <Info size={18} />
            <span>
              New transcript requests are shared with the monitoring group
              automatically.
            </span>
            <button type="button" aria-label="Dismiss notice">
              <X size={15} />
            </button>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => openTranscriptModal()}
          >
            <Plus size={15} />
            <span>New Transcript</span>
          </button>
        </div>

        {addMessage && (
          <div className="add-confirmation" role="status">
            <CheckCircle2 size={16} />
            <span>{addMessage}</span>
            <button
              type="button"
              aria-label="Dismiss added transcript confirmation"
              onClick={() => setAddMessage("")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <section className="summary-grid" aria-label="Transcript summary">
          {dashboardSummaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                className="metric-card metric-card-button"
                key={card.label}
                type="button"
                onClick={() => openCollection(card.filter)}
              >
                <span className={`metric-icon ${card.tone}`}>
                  <Icon size={31} />
                </span>
                <div>
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                  <span className={`metric-caption ${card.tone}`}>
                    {card.caption}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        <section className="panel status-panel">
          <h2>Status Overview</h2>
          <div className="status-body">
            <div
              className="donut-wrap"
              aria-label={`${records.length} total transcripts`}
            >
              <div
                className="donut-chart"
                style={{ background: buildDonutGradient(statusItems, records.length) }}
              >
                <div className="donut-hole">
                  <strong>{records.length}</strong>
                  <span>Total</span>
                </div>
              </div>
            </div>

            <div className="status-list">
              {statusItems.map((item) => (
                <div className="status-row" key={item.label}>
                  <span
                    className="status-dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="status-name">{item.label}</span>
                  <span className="status-value">{item.value}</span>
                  <span className="status-percent">{item.percent}</span>
                  <span className="status-track" aria-hidden="true">
                    <span
                      style={{
                        backgroundColor: item.color,
                        width: item.percent,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel table-panel">
          {renderFilters()}
          {renderTranscriptTable(records.slice(0, 10), {
            emptyText: "No transcripts added yet. Use New Transcript to add records.",
          })}
        </section>
      </>
    );
  }

  function renderCollectionContent(filter: SummaryFilter) {
    const tableRecords = getFilteredRecords(filter);

    return (
      <>
        <section className="internal-header">
          <button
            className="back-button"
            type="button"
            onClick={() => setView({ type: "dashboard" })}
          >
            <ArrowLeft size={17} />
            <span>Dashboard</span>
          </button>
          <div>
            <h2>{filterTitles[filter]}</h2>
            <p>{tableRecords.length} transcript records</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => openTranscriptModal()}
          >
            <Plus size={15} />
            <span>New Transcript</span>
          </button>
        </section>

        {addMessage && (
          <div className="add-confirmation" role="status">
            <CheckCircle2 size={16} />
            <span>{addMessage}</span>
            <button
              type="button"
              aria-label="Dismiss transcript confirmation"
              onClick={() => setAddMessage("")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <section className="panel table-panel">
          {renderFilters()}
          {renderTranscriptTable(tableRecords, {
            returnFilter: filter,
            emptyText: "No transcripts match this page yet.",
          })}
        </section>
      </>
    );
  }

  function renderDetailContent(transcript: DashboardTranscript | undefined) {
    if (!transcript) {
      return (
        <section className="internal-header">
          <button className="back-button" type="button" onClick={returnFromDetail}>
            <ArrowLeft size={17} />
            <span>Back</span>
          </button>
          <div>
            <h2>Transcript not found</h2>
            <p>This transcript may have been deleted.</p>
          </div>
        </section>
      );
    }

    const commentValue = commentDrafts[transcript.id] ?? transcript.comment;

    return (
      <>
        <section className="internal-header">
          <button className="back-button" type="button" onClick={returnFromDetail}>
            <ArrowLeft size={17} />
            <span>Back</span>
          </button>
          <div>
            <h2>{transcript.id}</h2>
            <p>{getTaxpayer(transcript)}</p>
          </div>
          {canEditTranscriptNow && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => openTranscriptModal(transcript)}
            >
              <Edit3 size={15} />
              <span>Edit</span>
            </button>
          )}
        </section>

        {addMessage && (
          <div className="add-confirmation" role="status">
            <CheckCircle2 size={16} />
            <span>{addMessage}</span>
            <button
              type="button"
              aria-label="Dismiss transcript confirmation"
              onClick={() => setAddMessage("")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <section className="panel transcript-detail-panel">
          <div className="detail-grid">
            <div>
              <span>Transcript ID</span>
              <strong>{transcript.id}</strong>
            </div>
            <div>
              <span>Taxpayer</span>
              <strong>{getTaxpayer(transcript)}</strong>
            </div>
            <div>
              <span>Requested Date</span>
              <strong>{formatRequestedDate(transcript.createdTime)}</strong>
            </div>
            <div>
              <span>Current Status</span>
              <strong>
                <span className={`status-badge ${getStatusClass(transcript.status)}`}>
                  {transcript.status}
                </span>
              </strong>
            </div>
            <div>
              <span>Age</span>
              <strong>{getTranscriptAge(transcript.createdTime)}</strong>
            </div>
            <div>
              <span>Priority</span>
              <strong>
                <span
                  className={`priority-badge ${
                    transcript.priority === "High" ? "high" : ""
                  }`}
                >
                  {transcript.priority === "High" && <ShieldAlert size={13} />}
                  {transcript.priority}
                </span>
              </strong>
            </div>
            <div>
              <span>Assigned To</span>
              <strong>{transcript.assigned}</strong>
            </div>
          </div>

          <div className="import-detail-grid">
            <div>
              <span>Payer Type</span>
              <strong>{transcript.payerType}</strong>
            </div>
            <div>
              <span>Name</span>
              <strong>{transcript.name || "-"}</strong>
            </div>
            <div>
              <span>Business Name</span>
              <strong>{transcript.businessName || "-"}</strong>
            </div>
            <div>
              <span>Product</span>
              <strong>{transcript.product}</strong>
            </div>
            <div>
              <span>Flow Type</span>
              <strong>{transcript.flowType}</strong>
            </div>
          </div>

          <div className="detail-action-row">
            {canUpdateStatusNow && (
              <label>
                <span>Update Status</span>
                <select
                  value={transcript.status}
                  onChange={(event) =>
                    updateTranscriptStatus(transcript.id, event.target.value)
                  }
                >
                  {transcriptStatusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            )}
            {canEditTranscriptNow && (
              <label>
                <span>Update Priority</span>
                <select
                  value={transcript.priority}
                  onChange={(event) =>
                    updateTranscriptPriority(
                      transcript.id,
                      event.target.value as DashboardTranscript["priority"],
                    )
                  }
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            )}
            {!canEditTranscriptNow && (
              <p className="permission-note">
                {currentUser.role === "Reviewer"
                  ? "Transcript details are read-only for Reviewer."
                  : "Transcript details and status are read-only for Support."}
              </p>
            )}
          </div>

          <label className="comment-editor">
            <span>Comment</span>
            <textarea
              value={commentValue}
              disabled={!canEditTranscriptNow}
              onChange={(event) =>
                setCommentDrafts((drafts) => ({
                  ...drafts,
                  [transcript.id]: event.target.value,
                }))
              }
              placeholder="Add transcript comment"
            />
          </label>

          {canEditTranscriptNow && (
            <button
              className="primary-modal-button detail-save-button"
              type="button"
              onClick={() => updateTranscriptComment(transcript.id, commentValue)}
            >
              <Save size={15} />
              <span>Save Comment</span>
            </button>
          )}
        </section>

        <section className="panel history-panel">
          <div className="history-heading">
            <History size={18} />
            <h2>History</h2>
          </div>

          <div className="history-list">
            {transcript.history
              .slice()
              .sort(
                (first, second) =>
                  new Date(second.occurredAt).getTime() -
                  new Date(first.occurredAt).getTime(),
              )
              .map((entry) => (
                <article className="history-item" key={entry.id}>
                  <span className="history-dot" />
                  <div>
                    <strong>{entry.action}</strong>
                    <p>{entry.detail}</p>
                    <small>
                      {entry.user} - {entry.timestamp}
                    </small>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </>
    );
  }

  function renderTeamContent() {
    if (!canManageTeamNow) {
      return (
        <section className="internal-header">
          <button
            className="back-button"
            type="button"
            onClick={() => setView({ type: "dashboard" })}
          >
            <ArrowLeft size={17} />
            <span>Dashboard</span>
          </button>
          <div>
            <h2>Team access unavailable</h2>
            <p>Your current role cannot manage Team users.</p>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="internal-header">
          <button
            className="back-button"
            type="button"
            onClick={() => setView({ type: "dashboard" })}
          >
            <ArrowLeft size={17} />
            <span>Dashboard</span>
          </button>
          <div>
            <h2>Team</h2>
            <p>Member users, invitation status, and role rights</p>
          </div>
          <button className="primary-button" type="button" onClick={openTeamModal}>
            <UserPlus size={15} />
            <span>Add Member</span>
          </button>
        </section>

        {teamMessage && (
          <div className="add-confirmation" role="status">
            <CheckCircle2 size={16} />
            <span>{teamMessage}</span>
            <button
              type="button"
              aria-label="Dismiss team confirmation"
              onClick={() => setTeamMessage("")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <section className="panel team-panel">
          <div className="team-panel-heading">
            <h2>Member Users</h2>
            <span>{teamMembers.length} users</span>
          </div>

          <div className="table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Member User</th>
                  <th>Email</th>
                  <th>Verified User</th>
                  <th>Rights</th>
                  <th>Invitation</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <span className="member-avatar">
                          {getInitials(member.name)}
                        </span>
                        <strong>{member.name}</strong>
                      </div>
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <span
                        className={`verified-badge ${
                          member.verified ? "verified" : "pending"
                        }`}
                      >
                        {member.verified ? "Verified User" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={member.role}
                        disabled={!member.verified}
                        onChange={(event) =>
                          updateMemberRole(member.id, event.target.value as TeamRole)
                        }
                      >
                        {teamRoleOptions.map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {member.verified ? (
                        <span className="invite-status">
                          Accepted {member.verifiedAt}
                        </span>
                      ) : (
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => openInvitation(member.id)}
                        >
                          <ShieldCheck size={14} />
                          <span>Accept Invitation</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel permission-matrix-panel">
          <h2>Permission Matrix</h2>
          <div className="table-scroll">
            <table className="permission-table">
              <thead>
                <tr>
                  <th>Functionality</th>
                  <th>Admin</th>
                  <th>Support</th>
                  <th>Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["View application options", "Yes", "Yes", "Yes"],
                  ["View transcripts", "Yes", "Yes", "Yes"],
                  ["Upload transcript via New Transcript", "Yes", "Yes", "Yes"],
                  ["Edit transcript details", "Yes", "No", "No"],
                  ["Update transcript status", "Yes", "No", "Yes"],
                  ["Admin-level functionality", "Yes", "No", "No"],
                  ["Manage Team/users", "Yes", "No", "No"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  function renderInvitationContent(member: TeamMember | undefined) {
    if (!member) {
      return (
        <section className="internal-header">
          <button
            className="back-button"
            type="button"
            onClick={() => setView({ type: "dashboard" })}
          >
            <ArrowLeft size={17} />
            <span>Dashboard</span>
          </button>
          <div>
            <h2>Invitation not found</h2>
            <p>This invitation may have been removed.</p>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="internal-header">
          <button
            className="back-button"
            type="button"
            onClick={() =>
              canManageTeamNow ? setView({ type: "team" }) : setView({ type: "dashboard" })
            }
          >
            <ArrowLeft size={17} />
            <span>{canManageTeamNow ? "Team" : "Dashboard"}</span>
          </button>
          <div>
            <h2>Accept Invitation</h2>
            <p>{member.email}</p>
          </div>
        </section>

        <section className="panel invitation-panel">
          {member.verified ? (
            <>
              <div className="invitation-summary">
                <ShieldCheck size={24} />
                <div>
                  <h2>Invitation already accepted</h2>
                  <p>{member.name} is listed as a Verified User.</p>
                </div>
              </div>
              <button
                className="primary-modal-button detail-save-button"
                type="button"
                onClick={() => setCurrentUserId(member.id)}
              >
                Sign In as Member
              </button>
            </>
          ) : (
            <>
              <div className="invitation-summary">
                <ShieldCheck size={24} />
                <div>
                  <h2>Create member account</h2>
                  <p>Complete account creation to verify this invited user.</p>
                </div>
              </div>

              {visibleInvitationErrors.length > 0 && (
                <div className="modal-errors" role="alert">
                  <AlertCircle size={17} />
                  <div>
                    {visibleInvitationErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="team-form-grid">
                <label>
                  <span>Member User</span>
                  <input value={member.name} readOnly />
                </label>
                <label>
                  <span>Email</span>
                  <input value={member.email} readOnly />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={invitationForm.password}
                    onChange={(event) =>
                      setInvitationForm((form) => ({
                        ...form,
                        password: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    value={invitationForm.confirmPassword}
                    onChange={(event) =>
                      setInvitationForm((form) => ({
                        ...form,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <button
                className="primary-modal-button detail-save-button"
                type="button"
                onClick={() => acceptInvitation(member)}
              >
                Create Account & Sign In
              </button>
            </>
          )}
        </section>
      </>
    );
  }

  function getActivityIcon(activity: ActivityEntry) {
    if (activity.action.includes("Status")) {
      return Check;
    }

    if (activity.action.includes("Priority")) {
      return TriangleAlert;
    }

    if (activity.action.includes("Comment")) {
      return ClipboardCheck;
    }

    if (activity.action.includes("edited")) {
      return Edit3;
    }

    return FilePlus2;
  }

  function getActivityTone(activity: ActivityEntry) {
    if (activity.action.includes("Priority")) {
      return "orange";
    }

    if (activity.action.includes("Comment")) {
      return "purple";
    }

    if (activity.action.includes("edited")) {
      return "blue";
    }

    return "teal";
  }

  function renderRightRail() {
    return (
      <aside className="right-rail" aria-label="Monitoring activity">
        <section className="rail-panel alerts-panel">
          <div className="rail-heading">
            <h2>Alerts & Status Changes</h2>
            <a href="#">View All</a>
          </div>

          <div className="alert-list">
            {activeUrgentAlerts.length > 0 &&
              activeUrgentAlerts.slice(0, 5).map((alert) => (
                <article className="alert-item urgent-alert-item" key={alert.id}>
                  <span className="alert-icon red">
                    <TriangleAlert size={19} />
                  </span>
                  <div>
                    <p>
                      <strong>Urgent transcript alert</strong>{" "}
                      <b className="red">{alert.transcriptId}</b>
                    </p>
                    <p className="urgent-alert-message">{alert.message}</p>
                    <time>{alert.timestamp}</time>
                    <button
                      className="cross-out-button"
                      type="button"
                      onClick={() => dismissUrgentAlert(alert.id)}
                    >
                      <X size={14} />
                      <span>Cross out</span>
                    </button>
                  </div>
                </article>
              ))}

            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity);
                const tone = getActivityTone(activity);

                return (
                  <article className="alert-item" key={activity.id}>
                    <span className={`alert-icon ${tone}`}>
                      <Icon size={19} />
                    </span>
                    <div>
                      <p>
                        <strong>{activity.transcriptId}</strong>{" "}
                        {activity.action.toLowerCase()}{" "}
                        <b className={tone}>{activity.user}</b>
                      </p>
                      <time>{activity.timestamp}</time>
                    </div>
                  </article>
                );
              })
            ) : (
              activeUrgentAlerts.length === 0 && (
                <div className="empty-rail">No status changes yet.</div>
              )
            )}
          </div>

          <a className="rail-link" href="#">
            <span>View all alerts</span>
            <ChevronRight size={17} />
          </a>
        </section>

        <section className="rail-panel daily-panel">
          <div className="rail-heading">
            <h2>Daily Monitoring</h2>
            <CalendarDays size={18} />
          </div>

          <p>Last reviewed:</p>
          <strong className="review-time">
            {updatedTodayCount > 0 ? "Today" : "Not reviewed"}
          </strong>

          <div className="daily-count">
            <span className="metric-icon blue">
              <FileText size={29} />
            </span>
            <div>
              <strong>{updatedTodayCount}</strong>
              <span>records updated today</span>
            </div>
          </div>

          <button
            className="rail-link rail-button-link"
            type="button"
            onClick={() => openCollection("monitoring-required")}
          >
            <span>View Monitoring Queue</span>
            <ChevronRight size={17} />
          </button>
        </section>
      </aside>
    );
  }

  const currentMainContent =
    view.type === "collection"
      ? renderCollectionContent(view.filter)
      : view.type === "detail"
        ? renderDetailContent(selectedTranscript)
        : view.type === "team"
          ? renderTeamContent()
          : view.type === "invitation"
            ? renderInvitationContent(selectedInvitationMember)
            : renderDashboardContent();
  const visibleNavItems = navItems.filter(
    (item) => item.label !== "Team" || canManageTeamNow,
  );

  return (
    <main className="dashboard-shell" data-source-modal-ready="true">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-main">
          <div className="brand-mark" aria-hidden="true">
            <HomeIcon size={21} strokeWidth={2.2} />
          </div>
          <nav className="nav-list">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = getNavActive(item.label);

              return (
                <a
                  className={`nav-link ${active ? "active" : ""}`}
                  href="#"
                  key={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => handleNavClick(event, item.label)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <a className="nav-link soft" href="#">
            <HelpCircle size={19} />
            <span>Help & Support</span>
          </a>
          <button className="nav-link soft collapse-button" type="button">
            <ArrowLeft size={20} />
            <span>Collapse</span>
          </button>
        </div>
      </aside>

      <section className="app-surface" aria-label="Tax transcript dashboard">
        <header className="topbar">
          <h1>Tax Transcript Monitoring</h1>

          <div className="topbar-actions">
            <label className="search-box">
              <span className="sr-only">Search transcripts</span>
              <input
                type="search"
                placeholder="Search transcripts, taxpayers, or IDs..."
              />
              <Search size={20} aria-hidden="true" />
            </label>

            <button className="notification-button" type="button">
              <Bell size={20} />
              <span className="notification-count">{notificationCount}</span>
              <span>Notifications</span>
            </button>

            <label className="account-switcher">
              <span className="avatar">{getInitials(currentUser.name)}</span>
              <span className="sr-only">Active account</span>
              <select
                value={currentUser.id}
                onChange={(event) => handleCurrentUserChange(event.target.value)}
              >
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.role}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </label>
          </div>
        </header>

        <div className="content-grid">
          <div className="main-column">{currentMainContent}</div>
          {renderRightRail()}
        </div>
      </section>

      {isTranscriptModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="transcript-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-transcript-title"
          >
            <header className="modal-header">
              <div>
                <p>{editingTranscriptId ? "Edit Transcript" : "New Transcript"}</p>
                <h2 id="new-transcript-title">
                  {editingTranscriptId
                    ? "Update transcript details"
                    : "Add transcript requests"}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close transcript dialog"
                onClick={closeTranscriptModal}
              >
                <X size={18} />
              </button>
            </header>

            {!editingTranscriptId && (
              <div
                className="modal-mode-switch"
                aria-label="Transcript entry mode"
              >
                <button
                  className={entryMode === "bulk" ? "active" : ""}
                  type="button"
                  onClick={() => {
                    setEntryMode("bulk");
                    setSubmitAttempted(false);
                  }}
                >
                  <ClipboardPaste size={16} />
                  <span>Bulk Paste</span>
                </button>
                <button
                  className={entryMode === "manual" ? "active" : ""}
                  type="button"
                  onClick={() => {
                    setEntryMode("manual");
                    setSubmitAttempted(false);
                  }}
                >
                  <FilePlus2 size={16} />
                  <span>One by One</span>
                </button>
              </div>
            )}

            <div className="column-order" aria-label="Required column order">
              {transcriptColumns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>

            {visibleValidationErrors.length > 0 && (
              <div className="modal-errors" role="alert">
                <AlertCircle size={17} />
                <div>
                  {visibleValidationErrors.slice(0, 4).map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                  {visibleValidationErrors.length > 4 && (
                    <p>{visibleValidationErrors.length - 4} more validation errors.</p>
                  )}
                </div>
              </div>
            )}

            {entryMode === "bulk" && !editingTranscriptId ? (
              <div className="bulk-entry">
                <label>
                  <span>Paste transcript rows from Excel</span>
                  <textarea
                    value={bulkText}
                    onChange={(event) => setBulkText(event.target.value)}
                    placeholder={
                      "TR-1050\t08/10/2026 6:30 PM\tIndividual\tJohn D. Smith\t\t1040\tMonitoring\tPending\tInitial request\tAvery Brooks"
                    }
                  />
                </label>
                <p>
                  Paste tab-separated Excel rows in the column order above. Header
                  row is allowed. Maximum 5 transcripts per batch.
                </p>

                <div className="bulk-preview">
                  <div className="bulk-preview-heading">
                    <strong>Preview</strong>
                    <span>
                      {activeRows.length} / {maxTranscriptBatch} transcripts
                    </span>
                  </div>
                  <div className="bulk-preview-scroll">
                    <table className="bulk-preview-table">
                      <thead>
                        <tr>
                          {transcriptColumns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.length > 0 ? (
                          previewRows.map((row, index) => (
                            <tr key={`${row.id}-${index}`}>
                              <td>{row.id || "-"}</td>
                              <td>{row.createdTime || "-"}</td>
                              <td>{row.payerType || "-"}</td>
                              <td>{row.name || "-"}</td>
                              <td>{row.businessName || "-"}</td>
                              <td>{row.product || "-"}</td>
                              <td>{row.flowType || "-"}</td>
                              <td>{row.transcriptStatus || "-"}</td>
                              <td>{row.comment || "-"}</td>
                              <td>{row.assignedTo || "-"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={transcriptColumns.length}>
                              Paste transcript rows to preview them here.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="manual-entry">
                {manualRows.map((row, index) => (
                  <article className="manual-record" key={index}>
                    <div className="manual-record-heading">
                      <strong>
                        {editingTranscriptId
                          ? "Transcript details"
                          : `Transcript ${index + 1}`}
                      </strong>
                      {!editingTranscriptId && (
                        <button
                          type="button"
                          aria-label={`Remove transcript ${index + 1}`}
                          onClick={() => removeManualRow(index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="manual-field-grid">
                      <label>
                        <span>ID</span>
                        <input
                          value={row.id}
                          onChange={(event) =>
                            updateManualRow(index, "id", event.target.value)
                          }
                          placeholder="TR-1050"
                        />
                      </label>
                      <label>
                        <span>Created_time</span>
                        <input
                          value={row.createdTime}
                          onChange={(event) =>
                            updateManualRow(index, "createdTime", event.target.value)
                          }
                          placeholder="08/10/2026 6:30 PM"
                        />
                      </label>
                      <label>
                        <span>Payer Type</span>
                        <select
                          value={row.payerType}
                          onChange={(event) =>
                            updateManualRow(index, "payerType", event.target.value)
                          }
                        >
                          {payerTypes.map((payerType) => (
                            <option key={payerType}>{payerType}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Name</span>
                        <input
                          value={row.name}
                          onChange={(event) =>
                            updateManualRow(index, "name", event.target.value)
                          }
                          placeholder="Taxpayer name"
                        />
                      </label>
                      <label>
                        <span>Business Name</span>
                        <input
                          value={row.businessName}
                          onChange={(event) =>
                            updateManualRow(
                              index,
                              "businessName",
                              event.target.value,
                            )
                          }
                          placeholder="Business name"
                        />
                      </label>
                      <label>
                        <span>Product</span>
                        <input
                          value={row.product}
                          onChange={(event) =>
                            updateManualRow(index, "product", event.target.value)
                          }
                          placeholder="1040, 1120, 941..."
                          list="product-options"
                        />
                      </label>
                      <label>
                        <span>Flow Type</span>
                        <input
                          value={row.flowType}
                          onChange={(event) =>
                            updateManualRow(index, "flowType", event.target.value)
                          }
                          placeholder="Monitoring"
                          list="flow-type-options"
                        />
                      </label>
                      <label>
                        <span>Transcript Status</span>
                        <select
                          value={row.transcriptStatus}
                          onChange={(event) =>
                            updateManualRow(
                              index,
                              "transcriptStatus",
                              event.target.value,
                            )
                          }
                        >
                          {transcriptStatusOptions.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="wide-field">
                        <span>Comment</span>
                        <input
                          value={row.comment}
                          onChange={(event) =>
                            updateManualRow(index, "comment", event.target.value)
                          }
                          placeholder="Optional note"
                        />
                      </label>
                      <label>
                        <span>Assigned To</span>
                        <input
                          value={row.assignedTo}
                          onChange={(event) =>
                            updateManualRow(index, "assignedTo", event.target.value)
                          }
                          placeholder="Assigned person"
                          list="assigned-to-options"
                        />
                      </label>
                    </div>
                  </article>
                ))}

                {!editingTranscriptId && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={addManualRow}
                    disabled={manualRows.length >= maxTranscriptBatch}
                  >
                    <Plus size={15} />
                    <span>Add another transcript</span>
                  </button>
                )}
              </div>
            )}

            <datalist id="product-options">
              {productOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="flow-type-options">
              {flowTypeOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="assigned-to-options">
              {availableUsers.map((user) => (
                <option key={user.id} value={user.name} />
              ))}
            </datalist>

            <footer className="modal-footer">
              <span>
                {editingTranscriptId
                  ? "Editing 1 transcript"
                  : `${activeRows.length} / ${maxTranscriptBatch} transcripts selected`}
              </span>
              <div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeTranscriptModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-modal-button"
                  type="button"
                  onClick={submitTranscripts}
                >
                  {editingTranscriptId ? "Save Changes" : "Add Transcripts"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {isTeamModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="team-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
          >
            <header className="modal-header">
              <div>
                <p>Team</p>
                <h2 id="add-member-title">Add member user</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close add member dialog"
                onClick={closeTeamModal}
              >
                <X size={18} />
              </button>
            </header>

            <div className="team-modal-body">
              {visibleTeamErrors.length > 0 && (
                <div className="modal-errors" role="alert">
                  <AlertCircle size={17} />
                  <div>
                    {visibleTeamErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="team-form-grid">
                <label>
                  <span>Member User</span>
                  <input
                    value={teamForm.name}
                    onChange={(event) =>
                      setTeamForm((form) => ({
                        ...form,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Member name"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={teamForm.email}
                    onChange={(event) =>
                      setTeamForm((form) => ({
                        ...form,
                        email: event.target.value,
                      }))
                    }
                    placeholder="member@example.com"
                  />
                </label>
              </div>

              <div className="pending-invite-note">
                New member users are added as pending and are not shown as
                Verified User until they accept the invitation.
              </div>
            </div>

            <footer className="modal-footer">
              <span>Default rights: Support</span>
              <div>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeTeamModal}
                >
                  Cancel
                </button>
                <button
                  className="primary-modal-button"
                  type="button"
                  onClick={submitTeamMember}
                >
                  Send Invitation
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
