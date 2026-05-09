import { useState, useEffect, useCallback } from "react";

// ── API base & helpers ────────────────────────────────────────────────────────
const API = "https://backend-xyz.up.railway.app";

async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ── Color palette ─────────────────────────────────────────────────────────────
// Royal Blue: #2251CC  |  British Emerald: #1A7A4A  |  Danger: #C0392B

// ── Shared Components ─────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const styles = {
    "Pending":     { background: "#FEF3C7", color: "#92400E" },
    "In Progress": { background: "#DBEAFE", color: "#1E40AF" },
    "Completed":   { background: "#D1FAE5", color: "#065F46" },
  };
  return (
    <span style={{
      ...styles[status],
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
};

const Btn = ({ children, onClick, variant = "primary", disabled, style = {} }) => {
  const base = {
    padding: "9px 20px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, fontSize: 14, transition: "opacity .15s", opacity: disabled ? 0.6 : 1, ...style
  };
  const variants = {
    primary:   { background: "#2251CC", color: "#fff" },
    success:   { background: "#1A7A4A", color: "#fff" },
    danger:    { background: "#C0392B", color: "#fff" },
    ghost:     { background: "transparent", color: "#2251CC", border: "1.5px solid #2251CC" },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Input = ({ label, error, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>}
    <input
      {...props}
      style={{
        width: "100%", boxSizing: "border-box", padding: "9px 12px",
        border: `1.5px solid ${error ? "#C0392B" : "#D1D5DB"}`, borderRadius: 8,
        fontSize: 14, outline: "none", background: "#fff",
      }}
    />
    {error && <p style={{ color: "#C0392B", fontSize: 12, marginTop: 4 }}>{error}</p>}
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>}
    <select {...props} style={{
      width: "100%", padding: "9px 12px", border: "1.5px solid #D1D5DB",
      borderRadius: 8, fontSize: 14, background: "#fff", cursor: "pointer",
    }}>
      {children}
    </select>
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>
    {children}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  }}>
    <Card style={{ width: 420, maxHeight: "80vh", overflowY: "auto", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: "#111827", fontSize: 18 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6B7280" }}>×</button>
      </div>
      {children}
    </Card>
  </div>
);

// ── Login / Signup ─────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", role: "member" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.username || !form.password) return setError("All fields required");
    setError(""); setLoading(true);
    try {
      let data;
      if (mode === "login") {
        // Login uses form-encoded body (OAuth2 spec)
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: form.username, password: form.password }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");
      } else {
        data = await apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(form) });
      }
      onLogin(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Card style={{ width: 380 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, background: "#2251CC", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", fontSize: 22,
          }}>📋</div>
          <h2 style={{ margin: 0, color: "#111827" }}>TaskManager</h2>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>Team productivity, simplified</p>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 8, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "7px 0", border: "none", borderRadius: 6,
              fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all .15s",
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#2251CC" : "#6B7280",
              boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            }}>
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <Input label="Username" value={form.username} onChange={set("username")} placeholder="Enter username" />
        <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Enter password" />
        {mode === "signup" && (
          <Select label="Role" value={form.role} onChange={set("role")}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        )}

        {error && <p style={{ color: "#C0392B", fontSize: 13, marginBottom: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 6 }}>{error}</p>}

        <Btn onClick={submit} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </Btn>
      </Card>
    </div>
  );
}

// ── Dashboard Stats ────────────────────────────────────────────────────────────
function DashboardView({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiFetch("/dashboard", {}, token).then(setStats).catch(console.error);
  }, [token]);

  if (!stats) return <p style={{ color: "#6B7280" }}>Loading dashboard…</p>;

  const cards = [
    { label: "Total Tasks",  value: stats.total,       color: "#2251CC", bg: "#EFF6FF" },
    { label: "Pending",      value: stats.pending,      color: "#92400E", bg: "#FEF3C7" },
    { label: "In Progress",  value: stats.in_progress,  color: "#1E40AF", bg: "#DBEAFE" },
    { label: "Completed",    value: stats.completed,    color: "#1A7A4A", bg: "#D1FAE5" },
    { label: "⚠ Overdue",   value: stats.overdue,      color: "#C0392B", bg: "#FEF2F2" },
  ];

  return (
    <div>
      <h2 style={{ color: "#111827", marginTop: 0 }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <div key={c.label} style={{
            background: c.bg, borderRadius: 12, padding: "20px 16px",
            borderLeft: `4px solid ${c.color}`,
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 13, color: "#374151", marginTop: 4, fontWeight: 500 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Projects ──────────────────────────────────────────────────────────────────
function ProjectsView({ token, isAdmin }) {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => apiFetch("/projects", {}, token).then(setProjects), [token]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name) return setError("Project name required");
    setError(""); setLoading(true);
    try {
      await apiFetch("/projects", { method: "POST", body: JSON.stringify(form) }, token);
      setForm({ name: "", description: "" });
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#111827" }}>Projects</h2>
        {isAdmin && <Btn onClick={() => setShowModal(true)}>+ New Project</Btn>}
      </div>

      {projects.length === 0 ? (
        <Card><p style={{ color: "#6B7280", textAlign: "center" }}>No projects yet.</p></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {projects.map((p) => (
            <Card key={p.id}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{p.name}</div>
              <div style={{ color: "#6B7280", fontSize: 13, marginTop: 6 }}>{p.description || "No description"}</div>
              <div style={{
                marginTop: 12, fontSize: 11, fontWeight: 600, color: "#2251CC",
                background: "#EFF6FF", display: "inline-block", padding: "2px 8px", borderRadius: 6,
              }}>ID #{p.id}</div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Project" onClose={() => setShowModal(false)}>
          <Input label="Project Name *" value={form.name} onChange={set("name")} placeholder="e.g. Website Redesign" />
          <Input label="Description" value={form.description} onChange={set("description")} placeholder="Optional description" />
          {error && <p style={{ color: "#C0392B", fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create Project"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
function TasksView({ token, isAdmin, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", project_id: "", assignee_id: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([
      apiFetch("/tasks", {}, token),
      apiFetch("/projects", {}, token),
    ]);
    setTasks(t); setProjects(p);
    if (isAdmin) {
      const m = await apiFetch("/users", {}, token);
      setMembers(m);
    }
  }, [token, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title || !form.due_date || !form.project_id) return setError("Title, due date & project required");
    setError(""); setLoading(true);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          project_id: parseInt(form.project_id),
          assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        }),
      }, token);
      setForm({ title: "", description: "", due_date: "", project_id: "", assignee_id: "" });
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await apiFetch(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }, token);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "#111827" }}>Tasks</h2>
        {isAdmin && <Btn onClick={() => setShowModal(true)}>+ New Task</Btn>}
      </div>

      {tasks.length === 0 ? (
        <Card><p style={{ color: "#6B7280", textAlign: "center" }}>No tasks yet.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tasks.map((t) => {
            const overdue = t.due_date < today && t.status !== "Completed";
            return (
              <Card key={t.id} style={{ borderLeft: `4px solid ${overdue ? "#C0392B" : t.status === "Completed" ? "#1A7A4A" : "#2251CC"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#111827" }}>{t.title}</span>
                      <Badge status={t.status} />
                      {overdue && <span style={{ fontSize: 11, color: "#C0392B", fontWeight: 700 }}>OVERDUE</span>}
                    </div>
                    {t.description && <div style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>{t.description}</div>}
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>📁 {t.project?.name || `Project #${t.project_id}`}</span>
                      <span>📅 Due {t.due_date}</span>
                      {t.assignee && <span>👤 {t.assignee.username}</span>}
                    </div>
                  </div>

                  {/* Status selector — members can only update their own tasks */}
                  {(isAdmin || t.assignee_id === currentUser.id) && (
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value)}
                      style={{
                        padding: "6px 10px", borderRadius: 8, border: "1.5px solid #D1D5DB",
                        fontSize: 13, cursor: "pointer", background: "#F9FAFB",
                      }}
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="New Task" onClose={() => setShowModal(false)}>
          <Input label="Task Title *" value={form.title} onChange={set("title")} placeholder="e.g. Design homepage mockup" />
          <Input label="Description" value={form.description} onChange={set("description")} placeholder="Optional details" />
          <Input label="Due Date *" type="date" value={form.due_date} onChange={set("due_date")} />
          <Select label="Project *" value={form.project_id} onChange={set("project_id")}>
            <option value="">Select a project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Assign To" value={form.assignee_id} onChange={set("assignee_id")}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
          </Select>
          {error && <p style={{ color: "#C0392B", fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create Task"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main App Shell ────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tm_auth")); } catch { return null; }
  });
  const [tab, setTab] = useState("dashboard");

  const handleLogin = (data) => {
    localStorage.setItem("tm_auth", JSON.stringify(data));
    setAuth(data);
  };

  const logout = () => {
    localStorage.removeItem("tm_auth");
    setAuth(null);
  };

  if (!auth) return <AuthPage onLogin={handleLogin} />;

  const { access_token: token, user } = auth;
  const isAdmin = user.role === "admin";

  const navItems = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "projects",  label: "📁 Projects"  },
    { key: "tasks",     label: "✅ Tasks"      },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Top nav */}
      <div style={{
        background: "#2251CC", color: "#fff",
        display: "flex", alignItems: "center", padding: "0 24px",
        height: 60, gap: 32,
      }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>📋 TaskManager</span>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {navItems.map((n) => (
            <button key={n.key} onClick={() => setTab(n.key)} style={{
              background: tab === n.key ? "rgba(255,255,255,.18)" : "transparent",
              border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8,
              cursor: "pointer", fontSize: 14, fontWeight: tab === n.key ? 700 : 400,
            }}>
              {n.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
          <span style={{
            background: isAdmin ? "#1A7A4A" : "rgba(255,255,255,.2)",
            padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
          }}>
            {user.role.toUpperCase()}
          </span>
          <span style={{ opacity: 0.85 }}>👤 {user.username}</span>
          <Btn variant="ghost" onClick={logout} style={{ color: "#fff", border: "1.5px solid rgba(255,255,255,.4)", padding: "6px 14px" }}>
            Logout
          </Btn>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>
        {tab === "dashboard" && <DashboardView token={token} />}
        {tab === "projects"  && <ProjectsView token={token} isAdmin={isAdmin} />}
        {tab === "tasks"     && <TasksView token={token} isAdmin={isAdmin} currentUser={user} />}
      </div>
    </div>
  );
}
