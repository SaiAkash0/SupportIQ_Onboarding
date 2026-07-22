"use client";

import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  GripVertical,
  MapPin,
  RefreshCcw,
  Save,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ComponentKey = "aboutMe" | "address" | "birthdate";
type OnboardingPage = 2 | 3;

type ConfigItem = {
  key: ComponentKey;
  label: string;
  description: string;
  page: OnboardingPage;
  sortOrder: number;
};

const COMPONENT_ICONS = {
  aboutMe: UserRound,
  address: MapPin,
  birthdate: CalendarDays,
};

const DEFAULT_ASSIGNMENTS: Record<ComponentKey, OnboardingPage> = {
  aboutMe: 2,
  address: 3,
  birthdate: 2,
};

const DEFAULT_ORDERS: Record<ComponentKey, number> = {
  aboutMe: 0,
  address: 0,
  birthdate: 1,
};

export function AdminClient() {
  const [components, setComponents] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setMessage("");
      try {
        const response = await fetch("/api/config");
        const payload = await response.json();
        if (!response.ok) {
          setMessage(payload.error ?? "Configuration could not be loaded.");
          return;
        }

        const nextComponents = payload.components as ConfigItem[];
        setComponents(normalizeOrders(nextComponents));
      } catch {
        setMessage("Configuration could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const grouped = useMemo(
    () => ({
      2: components
        .filter((component) => component.page === 2)
        .sort((first, second) => first.sortOrder - second.sortOrder),
      3: components
        .filter((component) => component.page === 3)
        .sort((first, second) => first.sortOrder - second.sortOrder),
    }),
    [components]
  );

  const validationMessage =
    grouped[2].length === 0 || grouped[3].length === 0
      ? "Pages 2 and 3 must each include at least one component."
      : "";

  async function saveConfig() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          components: components.map(({ key, page, sortOrder }) => ({
            key,
            page,
            sortOrder,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Configuration could not be saved.");
        return;
      }

      const nextComponents = payload.components as ConfigItem[];
      setComponents(normalizeOrders(nextComponents));
      setMessage("Admin configuration saved.");
    } catch {
      setMessage("Configuration could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function assign(componentKey: ComponentKey, page: OnboardingPage) {
    setComponents((current) => {
      const next = current.map((component) => {
        if (component.key !== componentKey) {
          return component;
        }

        const targetLength = current.filter(
          (item) => item.key !== componentKey && item.page === page
        ).length;

        return { ...component, page, sortOrder: targetLength };
      });

      return normalizeOrders(next);
    });
  }

  function moveComponent(componentKey: ComponentKey, direction: -1 | 1) {
    setComponents((current) => {
      const target = current.find((component) => component.key === componentKey);
      if (!target) {
        return current;
      }

      const siblings = current
        .filter((component) => component.page === target.page)
        .sort((first, second) => first.sortOrder - second.sortOrder);
      const currentIndex = siblings.findIndex(
        (component) => component.key === componentKey
      );
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= siblings.length) {
        return current;
      }

      const reordered = [...siblings];
      [reordered[currentIndex], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[currentIndex],
      ];

      return normalizeOrders(
        current.map((component) => {
          const nextSiblingIndex = reordered.findIndex(
            (item) => item.key === component.key
          );

          return nextSiblingIndex >= 0
            ? { ...component, sortOrder: nextSiblingIndex }
            : component;
        })
      );
    });
  }

  function resetDefaults() {
    setComponents((current) =>
      normalizeOrders(
        current.map((component) => ({
          ...component,
          page: DEFAULT_ASSIGNMENTS[component.key],
          sortOrder: DEFAULT_ORDERS[component.key],
        }))
      )
    );
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Application navigation">
        <Link className="brand-mark" href="/">
          <span className="brand-icon">SIQ</span>
          <span>
            <strong>Support IQ</strong>
            <small>Admin</small>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            Onboarding
          </Link>
        </nav>
      </section>

      <section className="admin-layout">
        <div className="page-heading">
          <p className="eyebrow">Admin Section</p>
          <h1>Configure the wizard pages.</h1>
          <p className="lede">
            Assign each data component to page 2 or page 3. Each page always
            needs at least one component.
          </p>
        </div>

        <section className="admin-grid">
          <div className="panel">
            <div className="panel-heading">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h2>Component placement</h2>
                <p>Choose which page collects each data set.</p>
              </div>
            </div>

            {loading ? <p className="muted">Loading configuration...</p> : null}

            {!loading ? (
              <div className="assignment-list">
                {components.map((component) => {
                  const Icon = COMPONENT_ICONS[component.key];
                  return (
                    <article className="assignment-row" key={component.key}>
                      <div className="assignment-copy">
                        <span className="assignment-icon">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{component.label}</strong>
                          <small>{component.description}</small>
                        </span>
                      </div>
                      <div
                        className="segmented-control"
                        role="group"
                        aria-label={`${component.label} page assignment`}
                      >
                        {[2, 3].map((page) => (
                          <button
                            className={
                              component.page === page ? "selected" : ""
                            }
                            key={page}
                            onClick={() =>
                              assign(component.key, page as OnboardingPage)
                            }
                            type="button"
                          >
                            Page {page}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            <div className="button-row">
              <button
                className="secondary-button"
                disabled={saving}
                onClick={resetDefaults}
                type="button"
              >
                <RefreshCcw size={17} aria-hidden="true" />
                Defaults
              </button>
              <button
                className="primary-button"
                disabled={saving || Boolean(validationMessage)}
                onClick={saveConfig}
                type="button"
              >
                <Save size={17} aria-hidden="true" />
                Save configuration
              </button>
            </div>

            {validationMessage || message ? (
              <p className="status-message">{validationMessage || message}</p>
            ) : null}
          </div>

          <div className="panel preview-panel">
            <div className="panel-heading">
              <Check size={20} aria-hidden="true" />
              <div>
                <h2>Current flow preview</h2>
                <p>What the user will see after credentials.</p>
              </div>
            </div>

            {[2, 3].map((page) => (
              <div className="flow-preview" key={page}>
                <span>Page {page}</span>
                <div>
                  {grouped[page as OnboardingPage].map((component, index) => (
                    <div className="ordered-component" key={component.key}>
                      <span>
                        <GripVertical size={16} aria-hidden="true" />
                        <strong>{component.label}</strong>
                      </span>
                      <span className="order-buttons">
                        <button
                          aria-label={`Move ${component.label} up`}
                          disabled={index === 0}
                          onClick={() => moveComponent(component.key, -1)}
                          type="button"
                        >
                          <ArrowUp size={15} aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Move ${component.label} down`}
                          disabled={
                            index === grouped[page as OnboardingPage].length - 1
                          }
                          onClick={() => moveComponent(component.key, 1)}
                          type="button"
                        >
                          <ArrowDown size={15} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  ))}
                  {grouped[page as OnboardingPage].length === 0 ? (
                    <em>Needs at least one component</em>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function normalizeOrders(components: ConfigItem[]) {
  return [2, 3].flatMap((page) =>
    components
      .filter((component) => component.page === page)
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((component, index) => ({ ...component, sortOrder: index }))
  );
}
