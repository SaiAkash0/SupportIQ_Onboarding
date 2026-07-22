"use client";

import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type UserRecord = {
  id: string;
  email: string;
  aboutMe: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  birthdate: string;
  currentStep: 2 | 3;
  completed: boolean;
  passwordStored: boolean;
  createdAt: string;
  updatedAt: string;
};

export function DataClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/users");
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "User data could not be loaded.");
        return;
      }

      setUsers(payload.users ?? []);
      setMessage(`Showing ${payload.users?.length ?? 0} saved user records.`);
    } catch {
      setMessage("User data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Application navigation">
        <Link className="brand-mark" href="/">
          <span className="brand-icon">SIQ</span>
          <span>
            <strong>Support IQ</strong>
            <small>Data Table</small>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            Onboarding
          </Link>
        </nav>
      </section>

      <section className="data-layout">
        <section className="simple-table-panel">
          <div className="simple-table-header">
            <h1>Testing Table</h1>
            <button
              className="secondary-button icon-left"
              disabled={loading}
              onClick={loadUsers}
              type="button"
            >
              <RefreshCcw size={17} aria-hidden="true" />
              Refresh
            </button>
          </div>

          {message ? <p className="table-note">{message}</p> : null}

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Progress</th>
                  <th>About Me</th>
                  <th>Address</th>
                  <th>Birthdate</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.completed ? "Complete" : `Page ${user.currentStep}`}</td>
                    <td>{user.aboutMe || "-"}</td>
                    <td>{formatAddress(user)}</td>
                    <td>{user.birthdate || "-"}</td>
                  </tr>
                ))}
                {!loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No saved users yet.</td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={5}>Loading user data...</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function formatAddress(user: UserRecord) {
  const cityStateZip = [user.city, user.state, user.zip].filter(Boolean).join(", ");
  return [user.streetAddress, cityStateZip].filter(Boolean).join(" | ") || "-";
}
