/**
 * MembersManagement Component — SMART BID 2.0
 * Manages team members with real SharePoint data and Graph API people picker.
 * Model: Sector + Business Lines[] + Bid Role
 */

import * as React from "react";
import styles from "./MembersManagement.module.scss";
import {
  ITeamMember,
  IMembersData,
  Sector,
  BusinessLine,
  BidRole,
} from "../../models";
import { MembersService } from "../../services/MembersService";
import { useSpfxContext } from "../../config/SpfxContext";

/* ------------------------------------------------------------------ */
/* CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

interface ISectorMeta {
  key: Sector;
  label: string;
  color: string;
  bg: string;
  icon: string;
}

const SECTOR_META: ISectorMeta[] = [
  {
    key: "commercial",
    label: "Commercial",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    icon: "💼",
  },
  {
    key: "engineering",
    label: "Engineering",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    icon: "🛠️",
  },
  {
    key: "project",
    label: "Project",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    icon: "📋",
  },
  {
    key: "operation",
    label: "Operation",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    icon: "⚙️",
  },
  {
    key: "dataCenter",
    label: "Data Center",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    icon: "📡",
  },
  {
    key: "equipmentInstallation",
    label: "Equipment & Installation",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    icon: "🔧",
  },
  {
    key: "supplyChain",
    label: "Supply Chain",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    icon: "📦",
  },
];

const BUSINESS_LINES: BusinessLine[] = ["ROV", "OPG", "SURVEY"];

const BL_COLORS: Record<BusinessLine, { color: string; bg: string }> = {
  ROV: { color: "#0369a1", bg: "rgba(3,105,161,0.14)" },
  OPG: { color: "#b45309", bg: "rgba(180,83,9,0.14)" },
  SURVEY: { color: "#047857", bg: "rgba(4,120,87,0.14)" },
};

interface IBidRoleMeta {
  key: BidRole;
  label: string;
  color: string;
  bg: string;
}

const BID_ROLE_META: IBidRoleMeta[] = [
  {
    key: "contributor",
    label: "Contributor",
    color: "#6d28d9",
    bg: "rgba(109,40,217,0.12)",
  },
  {
    key: "manager",
    label: "Manager",
    color: "#be123c",
    bg: "rgba(190,18,60,0.12)",
  },
  {
    key: "coordinator",
    label: "Coordinator",
    color: "#0f766e",
    bg: "rgba(15,118,110,0.12)",
  },
  {
    key: "analyst",
    label: "Analyst",
    color: "#0284c7",
    bg: "rgba(2,132,199,0.12)",
  },
  {
    key: "lead",
    label: "Lead",
    color: "#d97706",
    bg: "rgba(217,119,6,0.12)",
  },
  {
    key: "sr-manager",
    label: "Sr. Manager",
    color: "#991b1b",
    bg: "rgba(153,27,27,0.12)",
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ------------------------------------------------------------------ */
/* People Picker Search Result                                        */
/* ------------------------------------------------------------------ */

interface IPeopleResult {
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  id: string;
  photoUrl: string;
}

/* ------------------------------------------------------------------ */
/* COMPONENT                                                          */
/* ------------------------------------------------------------------ */

const MembersManagement: React.FC = () => {
  const spfxContext = useSpfxContext();

  const [membersData, setMembersData] = React.useState<IMembersData>({
    members: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [sectorFilter, setSectorFilter] = React.useState<string>("all");
  const [blFilter, setBlFilter] = React.useState<string>("all");
  const [showPanel, setShowPanel] = React.useState(false);
  const [editMember, setEditMember] = React.useState<ITeamMember | null>(null);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Panel form state
  const [panelForm, setPanelForm] = React.useState({
    name: "",
    email: "",
    jobTitle: "",
    department: "",
    sector: "engineering" as Sector,
    businessLines: [] as BusinessLine[],
    bidRole: "contributor" as BidRole,
    photoUrl: "",
  });

  // People picker state
  const [peopleQuery, setPeopleQuery] = React.useState("");
  const [peopleResults, setPeopleResults] = React.useState<IPeopleResult[]>([]);
  const [showPeopleDropdown, setShowPeopleDropdown] = React.useState(false);
  const [searchingPeople, setSearchingPeople] = React.useState(false);
  const peoplePickerRef = React.useRef<HTMLDivElement>(null);

  /* ---- helpers --------------------------------------------------- */

  const showMsg = (type: "success" | "error", text: string): void => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  /* ---- load members from SharePoint ----------------------------- */

  const loadMembers = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await MembersService.getAll();
      setMembersData(data);
    } catch (error) {
      console.error("Error loading members:", error);
      showMsg("error", "Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMembers().catch(console.error);
  }, [loadMembers]);

  const allMembers = membersData.members || [];

  const filteredMembers = React.useMemo(() => {
    let list = allMembers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.jobTitle.toLowerCase().includes(q) ||
          m.sector.toLowerCase().includes(q) ||
          m.businessLines.some((bl) => bl.toLowerCase().includes(q)),
      );
    }
    if (sectorFilter !== "all") {
      list = list.filter((m) => m.sector === sectorFilter);
    }
    if (blFilter !== "all") {
      list = list.filter((m) =>
        m.businessLines.includes(blFilter as BusinessLine),
      );
    }
    return list;
  }, [allMembers, search, sectorFilter, blFilter]);

  const membersBySector = React.useMemo(() => {
    const grouped: Record<string, ITeamMember[]> = {};
    SECTOR_META.forEach((s) => {
      grouped[s.key] = filteredMembers.filter((m) => m.sector === s.key);
    });
    return grouped;
  }, [filteredMembers]);

  const sectorCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    SECTOR_META.forEach((s) => {
      counts[s.key] = allMembers.filter((m) => m.sector === s.key).length;
    });
    return counts;
  }, [allMembers]);

  /* ---- People Picker (Graph API) -------------------------------- */

  const searchPeople = React.useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setPeopleResults([]);
        setShowPeopleDropdown(false);
        return;
      }

      setSearchingPeople(true);
      try {
        const graphClient =
          await spfxContext.msGraphClientFactory.getClient("3");
        const response = await graphClient
          .api("/users")
          .filter(
            `startswith(displayName,'${query}') or startswith(mail,'${query}')`,
          )
          .select("id,displayName,mail,userPrincipalName,jobTitle,department")
          .top(8)
          .get();

        const results: IPeopleResult[] = (response.value || []).map(
          (u: {
            id: string;
            displayName: string;
            mail: string;
            userPrincipalName: string;
            jobTitle: string;
            department: string;
          }) => ({
            id: u.id,
            displayName: u.displayName || "",
            email: u.mail || u.userPrincipalName || "",
            jobTitle: u.jobTitle || "",
            department: u.department || "",
            photoUrl: "",
          }),
        );

        setPeopleResults(results);
        setShowPeopleDropdown(results.length > 0);

        // Fetch photos in background for each result
        results.forEach((person, idx) => {
          graphClient
            .api(`/users/${person.id}/photo/$value`)
            .get()
            .then(async (photoBlob: Blob) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64 = base64String.split(",")[1];
                const url = `data:image/jpeg;base64,${base64}`;
                setPeopleResults((prev) => {
                  const updated = [...prev];
                  if (updated[idx] && updated[idx].id === person.id) {
                    updated[idx] = { ...updated[idx], photoUrl: url };
                  }
                  return updated;
                });
              };
              reader.readAsDataURL(photoBlob);
            })
            .catch(() => {
              /* no photo available */
            });
        });
      } catch (error) {
        console.error("Error searching people:", error);
        setPeopleResults([]);
        setShowPeopleDropdown(false);
      } finally {
        setSearchingPeople(false);
      }
    },
    [spfxContext],
  );

  // Debounce people search
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handlePeopleQueryChange = React.useCallback(
    (query: string) => {
      setPeopleQuery(query);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => searchPeople(query), 300);
    },
    [searchPeople],
  );

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const selectPerson = React.useCallback(
    async (person: IPeopleResult) => {
      setPanelForm((prev) => ({
        ...prev,
        name: person.displayName,
        email: person.email,
        jobTitle: person.jobTitle,
        department: person.department,
        photoUrl: person.photoUrl || "",
      }));
      setPeopleQuery(person.displayName);
      setShowPeopleDropdown(false);
      setPeopleResults([]);

      // If photo was not loaded in the dropdown, fetch it now
      if (!person.photoUrl) {
        try {
          const graphClient =
            await spfxContext.msGraphClientFactory.getClient("3");
          const photoBlob = await graphClient
            .api(`/users/${person.id}/photo/$value`)
            .get();
          if (photoBlob) {
            const base64Photo = await blobToBase64(photoBlob);
            const photoUrl = `data:image/jpeg;base64,${base64Photo}`;
            if (photoUrl.startsWith("data:image")) {
              setPanelForm((prev) => ({ ...prev, photoUrl }));
            }
          }
        } catch (photoError) {
          console.warn("Could not fetch user photo:", photoError);
        }
      }
    },
    [spfxContext],
  );

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        peoplePickerRef.current &&
        !peoplePickerRef.current.contains(e.target as Node)
      ) {
        setShowPeopleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---- CRUD ------------------------------------------------------ */

  const openAddPanel = (): void => {
    setEditMember(null);
    setPanelForm({
      name: "",
      email: "",
      jobTitle: "",
      department: "",
      sector: "engineering",
      businessLines: [],
      bidRole: "contributor",
      photoUrl: "",
    });
    setPeopleQuery("");
    setPeopleResults([]);
    setShowPeopleDropdown(false);
    setShowPanel(true);
  };

  const openEditPanel = (m: ITeamMember): void => {
    setEditMember(m);
    setPanelForm({
      name: m.name,
      email: m.email,
      jobTitle: m.jobTitle,
      department: m.department,
      sector: m.sector,
      businessLines: m.businessLines || [],
      bidRole: m.bidRole,
      photoUrl: m.photoUrl || "",
    });
    setPeopleQuery(m.name);
    setShowPanel(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!panelForm.name.trim() || !panelForm.email.trim()) {
      showMsg("error", "Name and email are required");
      return;
    }

    setSaving(true);
    try {
      if (editMember) {
        const updated: ITeamMember = {
          ...editMember,
          sector: panelForm.sector,
          businessLines: panelForm.businessLines,
          bidRole: panelForm.bidRole,
        };
        await MembersService.updateMember(updated);
        showMsg("success", `${panelForm.name} updated`);
      } else {
        // Check for duplicate
        const emailLower = panelForm.email.toLowerCase();
        const isDuplicate = allMembers.some(
          (m) => m.email.toLowerCase() === emailLower,
        );
        if (isDuplicate) {
          showMsg("error", "This person is already a team member");
          setSaving(false);
          return;
        }

        const newMember: ITeamMember = {
          id: `mem-${Date.now()}`,
          name: panelForm.name,
          email: panelForm.email,
          jobTitle: panelForm.jobTitle,
          department: panelForm.department,
          sector: panelForm.sector,
          businessLines: panelForm.businessLines,
          bidRole: panelForm.bidRole,
          isActive: true,
          joinedDate: new Date().toISOString().split("T")[0],
          photoUrl: panelForm.photoUrl || "",
        };
        await MembersService.addMember(newMember);
        showMsg("success", `${panelForm.name} added`);
      }
      setShowPanel(false);
      await loadMembers();
    } catch (error) {
      console.error("Error saving member:", error);
      showMsg("error", "Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: ITeamMember): Promise<void> => {
    if (!confirm(`Remove ${member.name} from the team?`)) return;

    try {
      await MembersService.removeMember(member.id);
      showMsg("success", "Member removed");
      await loadMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      showMsg("error", "Failed to remove member");
    }
  };

  const toggleActive = async (member: ITeamMember): Promise<void> => {
    try {
      await MembersService.updateMember({
        ...member,
        isActive: !member.isActive,
      });
      await loadMembers();
    } catch (error) {
      console.error("Error toggling member:", error);
      showMsg("error", "Failed to update member status");
    }
  };

  /* ---- render ---------------------------------------------------- */

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Loading team members...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.headerIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Members Management</h2>
            <p className={styles.subtitle}>
              {allMembers.length} team members across{" "}
              {
                Object.keys(sectorCounts).filter((k) => sectorCounts[k] > 0)
                  .length
              }{" "}
              sectors
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`${styles.messageBar} ${message.type === "success" ? styles.success : styles.error}`}
        >
          {message.text}
        </div>
      )}

      {/* Stat Cards */}
      <div className={styles.statRow}>
        {SECTOR_META.map((s) => (
          <div key={s.key} className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {sectorCounts[s.key] || 0}
              </span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </div>
        ))}
        <div className={styles.statCard}>
          <div
            className={styles.statIcon}
            style={{
              background: "rgba(0,201,167,0.12)",
              color: "var(--primary-accent)",
            }}
          >
            ✓
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {allMembers.filter((m) => m.isActive).length}
            </span>
            <span className={styles.statLabel}>Active</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search members by name, email, sector, or business line..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <button
          className={`${styles.filterBtn} ${sectorFilter === "all" ? styles.active : ""}`}
          onClick={() => setSectorFilter("all")}
        >
          All
        </button>
        {SECTOR_META.map((s) => (
          <button
            key={s.key}
            className={`${styles.filterBtn} ${sectorFilter === s.key ? styles.active : ""}`}
            onClick={() => setSectorFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
        <span className={styles.filterSeparator}>|</span>
        <button
          className={`${styles.filterBtn} ${blFilter === "all" ? styles.active : ""}`}
          onClick={() => setBlFilter("all")}
        >
          All BLs
        </button>
        {BUSINESS_LINES.map((bl) => (
          <button
            key={bl}
            className={`${styles.filterBtn} ${blFilter === bl ? styles.active : ""}`}
            style={
              blFilter === bl
                ? {
                    borderColor: BL_COLORS[bl].color,
                    color: BL_COLORS[bl].color,
                  }
                : {}
            }
            onClick={() => setBlFilter(bl)}
          >
            {bl}
          </button>
        ))}
        <button className={styles.addBtn} onClick={openAddPanel}>
          + Add Member
        </button>
      </div>

      {/* Members grouped by sector */}
      {SECTOR_META.filter((s) => membersBySector[s.key]?.length > 0).map(
        (s) => (
          <div key={s.key} className={styles.roleSection}>
            <div className={styles.roleSectionHeader}>
              <span
                className={styles.roleBadge}
                style={{ background: s.bg, color: s.color }}
              >
                {s.icon} {s.label}
              </span>
              <span className={styles.roleCount}>
                {membersBySector[s.key].length} members
              </span>
            </div>
            <div className={styles.membersGrid}>
              {membersBySector[s.key].map((m) => {
                const bidRoleMeta = BID_ROLE_META.find(
                  (br) => br.key === m.bidRole,
                );
                return (
                  <div
                    key={m.id}
                    className={styles.memberCard}
                    style={{ opacity: m.isActive ? 1 : 0.5 }}
                  >
                    {m.photoUrl ? (
                      <img
                        className={styles.avatar}
                        src={m.photoUrl}
                        alt={m.name}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        className={styles.avatar}
                        style={{ background: getAvatarColor(m.name) }}
                      >
                        {getInitials(m.name)}
                      </div>
                    )}
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{m.name}</span>
                      <span className={styles.memberEmail}>{m.email}</span>
                      <div className={styles.memberMeta}>
                        {/* Business Lines */}
                        {m.businessLines.map((bl) => {
                          const blColor = BL_COLORS[bl];
                          return (
                            <span
                              key={bl}
                              className={`${styles.tag} ${styles.divisionTag}`}
                              style={{
                                background: blColor.bg,
                                color: blColor.color,
                              }}
                            >
                              {bl}
                            </span>
                          );
                        })}
                        {/* Bid Role */}
                        {bidRoleMeta && (
                          <span
                            className={`${styles.tag} ${styles.roleTag}`}
                            style={{
                              background: bidRoleMeta.bg,
                              color: bidRoleMeta.color,
                            }}
                          >
                            {bidRoleMeta.label}
                          </span>
                        )}
                        {/* Job Title — plain text, no badge */}
                        {m.jobTitle && (
                          <span className={styles.memberJobTitle}>
                            {m.jobTitle}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.memberActions}>
                      <button
                        className={styles.iconBtn}
                        title="Edit"
                        onClick={() => openEditPanel(m)}
                      >
                        ✎
                      </button>
                      <button
                        className={styles.iconBtn}
                        title={m.isActive ? "Deactivate" : "Activate"}
                        onClick={() => toggleActive(m)}
                      >
                        {m.isActive ? "⏸" : "▶"}
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.danger}`}
                        title="Remove"
                        onClick={() => handleDelete(m)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      )}

      {filteredMembers.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyText}>
            {allMembers.length === 0
              ? "No team members yet. Click '+ Add Member' to get started."
              : "No members found matching your search."}
          </div>
        </div>
      )}

      {/* Add/Edit Panel */}
      {showPanel && (
        <div className={styles.panelOverlay}>
          <div className={styles.panelHeader}>
            <h3>{editMember ? "Edit Member" : "Add Member"}</h3>
            <button
              className={styles.actionBtn}
              onClick={() => setShowPanel(false)}
            >
              ✕
            </button>
          </div>
          <div className={styles.panelBody}>
            {/* People Picker — only for Add mode */}
            {!editMember && (
              <div className={styles.fieldGroup} ref={peoplePickerRef}>
                <label>Search Person</label>
                <div className={styles.peoplePickerWrapper}>
                  <input
                    value={peopleQuery}
                    onChange={(e) =>
                      handlePeopleQueryChange(e.currentTarget.value)
                    }
                    placeholder="Start typing a name or email..."
                    autoComplete="off"
                  />
                  {searchingPeople && (
                    <span className={styles.pickerSpinner}>Searching...</span>
                  )}
                  {showPeopleDropdown && peopleResults.length > 0 && (
                    <div className={styles.peopleDropdown}>
                      {peopleResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={styles.peopleItem}
                          onClick={() => selectPerson(p)}
                        >
                          {p.photoUrl ? (
                            <img
                              className={styles.peopleItemAvatar}
                              src={p.photoUrl}
                              alt={p.displayName}
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              className={styles.peopleItemAvatar}
                              style={{
                                background: getAvatarColor(p.displayName),
                              }}
                            >
                              {getInitials(p.displayName)}
                            </div>
                          )}
                          <div className={styles.peopleItemInfo}>
                            <span className={styles.peopleItemName}>
                              {p.displayName}
                            </span>
                            <span className={styles.peopleItemDetail}>
                              {p.email}
                            </span>
                            {p.jobTitle && (
                              <span className={styles.peopleItemDetail}>
                                {p.jobTitle}
                                {p.department ? ` · ${p.department}` : ""}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label>Full Name</label>
              <input
                value={panelForm.name}
                placeholder="Selected from Search Person"
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Email</label>
              <input
                type="email"
                value={panelForm.email}
                placeholder="Selected from Search Person"
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Job Title</label>
              <input
                value={panelForm.jobTitle}
                placeholder="Selected from Search Person"
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Department</label>
              <input
                value={panelForm.department}
                placeholder="Selected from Search Person"
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
            {/* Sector */}
            <div className={styles.fieldGroup}>
              <label>Sector</label>
              <select
                value={panelForm.sector}
                onChange={(e) => {
                  const newSector = e.currentTarget.value as Sector;
                  setPanelForm({
                    ...panelForm,
                    sector: newSector,
                    bidRole:
                      panelForm.bidRole === "analyst" &&
                      newSector !== "engineering"
                        ? "contributor"
                        : panelForm.bidRole,
                  });
                }}
              >
                {SECTOR_META.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Business Lines — badge bucket */}
            <div className={styles.fieldGroup}>
              <label>Business Lines</label>
              <div className={styles.divisionBadgesSection}>
                {/* Assigned business lines */}
                {panelForm.businessLines.length > 0 && (
                  <div className={styles.assignedDivisionsArea}>
                    <span className={styles.divisionSectionLabel}>
                      Assigned Business Lines
                    </span>
                    <div className={styles.divisionBadgesRow}>
                      {panelForm.businessLines.map((bl) => {
                        const blColor = BL_COLORS[bl];
                        return (
                          <button
                            key={bl}
                            type="button"
                            className={styles.divisionBadgeClickable}
                            style={{
                              background: blColor.bg,
                              color: blColor.color,
                            }}
                            onClick={() =>
                              setPanelForm((prev) => ({
                                ...prev,
                                businessLines: prev.businessLines.filter(
                                  (b) => b !== bl,
                                ),
                              }))
                            }
                            title="Click to remove"
                          >
                            {bl} ✕
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available business lines */}
                {BUSINESS_LINES.filter(
                  (bl) => !panelForm.businessLines.includes(bl),
                ).length > 0 && (
                  <div className={styles.availableDivisionsArea}>
                    <span className={styles.divisionSectionLabel}>
                      Available Business Lines
                    </span>
                    <div className={styles.divisionBadgesRow}>
                      {BUSINESS_LINES.filter(
                        (bl) => !panelForm.businessLines.includes(bl),
                      ).map((bl) => {
                        const blColor = BL_COLORS[bl];
                        return (
                          <button
                            key={bl}
                            type="button"
                            className={`${styles.divisionBadgeClickable} ${styles.divisionBadgeFaded}`}
                            style={{
                              background: blColor.bg,
                              color: blColor.color,
                            }}
                            onClick={() =>
                              setPanelForm((prev) => ({
                                ...prev,
                                businessLines: [...prev.businessLines, bl],
                              }))
                            }
                            title="Click to assign"
                          >
                            + {bl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bid Role */}
            <div className={styles.fieldGroup}>
              <label>Bid Role</label>
              <select
                value={panelForm.bidRole}
                onChange={(e) =>
                  setPanelForm({
                    ...panelForm,
                    bidRole: e.currentTarget.value as BidRole,
                  })
                }
              >
                {BID_ROLE_META.filter(
                  (br) =>
                    br.key !== "analyst" || panelForm.sector === "engineering",
                ).map((br) => (
                  <option key={br.key} value={br.key}>
                    {br.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.panelFooter}>
            <button
              className={styles.actionBtn}
              onClick={() => setShowPanel(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className={`${styles.actionBtn} ${styles.primary}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : editMember ? "Update" : "Add Member"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersManagement;
