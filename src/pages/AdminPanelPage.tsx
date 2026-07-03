import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  apiRequest,
  type Role,
  type SellerApplication
} from "../api/client";
import { useAuth } from "../auth/AuthContext";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
};

const roles: Role[] = ["CUSTOMER", "SELLER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

export function AdminPanelPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"ALL" | SellerApplication["status"]>("PENDING");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);

    try {
      const applicationRequest = apiRequest<{ applications: SellerApplication[] }>(
        "/api/admin/seller-applications"
      );
      const usersRequest = user.role === "SUPER_ADMIN"
        ? apiRequest<{ users: AdminUser[] }>("/api/admin/users")
        : Promise.resolve({ users: [] });
      const [applicationData, userData] = await Promise.all([applicationRequest, usersRequest]);
      setApplications(applicationData.applications);
      setUsers(userData.users);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Could not load the admin panel."
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function reviewApplication(id: string, nextStatus: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setMessage(null);
    try {
      await apiRequest(`/api/admin/seller-applications/${id}`, {
        method: "PATCH",
        body: { status: nextStatus, adminNotes: notes[id] || undefined }
      });
      setApplications((current) => current.map((application) => (
        application.id === id ? { ...application, status: nextStatus } : application
      )));
      setMessage({ type: "success", text: `Application ${nextStatus.toLowerCase()}.` });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Could not review this application."
      });
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(userId: string, role: Role) {
    setBusyId(userId);
    setMessage(null);
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role }
      });
      setUsers((current) => current.map((entry) => entry.id === userId ? { ...entry, role } : entry));
      setMessage({ type: "success", text: "User role updated. Their existing sessions were revoked." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Could not update this role."
      });
    } finally {
      setBusyId(null);
    }
  }

  async function signOut() {
    await logout();
    navigate("/sign-in", { replace: true });
  }

  const visibleApplications = status === "ALL"
    ? applications
    : applications.filter((application) => application.status === status);

  return (
    <main className="admin-page">
      <nav className="topbar">
        <div>
          <strong>Administration</strong>
          <small>{user?.role.replace("_", " ")}</small>
        </div>
        <button type="button" className="secondary-button" onClick={() => void signOut()}>Sign out</button>
      </nav>

      <header className="admin-heading">
        <div>
          <span className="role-pill">Staff workspace</span>
          <h1>Admin panel</h1>
          <p>Review seller applications and manage access from one place.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadData()} disabled={loading}>
          Refresh
        </button>
      </header>

      {message ? <div className={`notice ${message.type}`}>{message.text}</div> : null}

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <h2>Seller applications</h2>
            <p>{applications.length} total applications</p>
          </div>
          <label className="compact-field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>

        {loading ? <p className="empty-state">Loading applications...</p> : null}
        {!loading && visibleApplications.length === 0 ? <p className="empty-state">No applications match this filter.</p> : null}
        <div className="application-grid">
          {visibleApplications.map((application) => (
            <article className="application-card" key={application.id}>
              <div className="card-title-row">
                <div>
                  <h3>{application.storeName}</h3>
                  <p>{application.fullLegalName} · {application.email}</p>
                </div>
                <span className={`status-pill ${application.status.toLowerCase()}`}>{application.status}</span>
              </div>
              <p>{application.storeDescription}</p>
              <dl className="details-grid">
                <div><dt>Location</dt><dd>{application.city}, {application.country}</dd></div>
                <div><dt>Categories</dt><dd>{application.productCategories.join(", ")}</dd></div>
              </dl>
              <label className="field">
                <span>Review notes</span>
                <textarea
                  value={notes[application.id] ?? application.adminNotes ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                  placeholder="Optional internal note"
                  rows={3}
                />
              </label>
              <div className="action-row">
                <button
                  type="button"
                  className="approve-button"
                  disabled={busyId === application.id}
                  onClick={() => void reviewApplication(application.id, "APPROVED")}
                >Approve</button>
                <button
                  type="button"
                  className="reject-button"
                  disabled={busyId === application.id}
                  onClick={() => void reviewApplication(application.id, "REJECTED")}
                >Reject</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {user?.role === "SUPER_ADMIN" ? (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <h2>User access</h2>
              <p>Only super admins can change roles.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Verified</th><th>Role</th></tr></thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.id}>
                    <td><strong>{entry.firstName} {entry.lastName}</strong><small>{entry.email}</small></td>
                    <td>{entry.emailVerified ? "Yes" : "No"}</td>
                    <td>
                      <select
                        aria-label={`Role for ${entry.email}`}
                        value={entry.role}
                        disabled={busyId === entry.id}
                        onChange={(event) => void changeRole(entry.id, event.target.value as Role)}
                      >
                        {roles.map((role) => <option value={role} key={role}>{role.replace("_", " ")}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
