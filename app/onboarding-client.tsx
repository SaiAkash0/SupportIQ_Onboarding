"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Lock,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

type ComponentKey = "aboutMe" | "address" | "birthdate";
type OnboardingPage = 2 | 3;

type ConfigItem = {
  key: ComponentKey;
  label: string;
  description: string;
  page: OnboardingPage;
  sortOrder: number;
};

type UserRecord = {
  id: string;
  email: string;
  aboutMe: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  birthdate: string;
  currentStep: OnboardingPage;
  completed: boolean;
  passwordStored: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  email: string;
  password: string;
  aboutMe: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  birthdate: string;
};

const EMPTY_FORM: FormData = {
  email: "",
  password: "",
  aboutMe: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  birthdate: "",
};

const FALLBACK_CONFIG: ConfigItem[] = [
  {
    key: "aboutMe",
    label: "About Me",
    description: "A short profile introduction.",
    page: 2,
    sortOrder: 0,
  },
  {
    key: "address",
    label: "Address",
    description: "Street, city, state, and ZIP code.",
    page: 3,
    sortOrder: 0,
  },
  {
    key: "birthdate",
    label: "Birthdate",
    description: "A simple date selector.",
    page: 2,
    sortOrder: 1,
  },
];

const STEP_LABELS = [
  { number: 1, label: "STEP 1", title: "Account" },
  { number: 2, label: "STEP 2", title: "Details" },
  { number: 3, label: "STEP 3", title: "More Details" },
] as const;

export function OnboardingClient() {
  const [config, setConfig] = useState<ConfigItem[]>(FALLBACK_CONFIG);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      setLoading(true);
      setMessage("");
      try {
        const [configResponse, sessionResponse] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/onboarding/session"),
        ]);
        const configPayload = await configResponse.json();
        const sessionPayload = await sessionResponse.json();

        if (!mounted) {
          return;
        }

        if (configPayload.components) {
          setConfig(configPayload.components);
        }

        if (sessionPayload.user) {
          const restoredUser = sessionPayload.user as UserRecord;

          if (restoredUser.completed) {
            await fetch("/api/onboarding/session", { method: "DELETE" });
            setForm(EMPTY_FORM);
            setActiveStep(1);
            setMessage("");
            return;
          }

          setForm(fromUser(restoredUser));
          setActiveStep(restoredUser.currentStep);
          setMessage("Your saved progress is loaded.");
        }
      } catch {
        if (mounted) {
          setMessage("Saved progress could not be loaded yet.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInitialState();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleComponents = useMemo(
    () =>
      activeStep === 2 || activeStep === 3
        ? config
            .filter((component) => component.page === activeStep)
            .sort((first, second) => first.sortOrder - second.sortOrder)
        : [],
    [activeStep, config]
  );

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/onboarding/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Account details could not be saved.");
        return;
      }

      const savedUser = payload.user as UserRecord;
      setForm((current) => ({
        ...fromUser(savedUser),
        password: current.password,
      }));
      if (savedUser.completed) {
        await fetch("/api/onboarding/session", { method: "DELETE" });
      }
      setActiveStep(savedUser.completed ? 4 : savedUser.currentStep);
      setMessage("Credentials saved to the backend. Continue with the next page.");
    } catch {
      setMessage("Account details could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitProfileStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeStep !== 2 && activeStep !== 3) {
      return;
    }

    const clientError = validateVisibleComponents(visibleComponents, form);
    if (clientError) {
      setMessage(clientError);
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: activeStep,
          fields: form,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "This step could not be saved.");
        return;
      }

      const savedUser = payload.user as UserRecord;
      setForm((current) => ({ ...current, ...fromUser(savedUser) }));
      if (activeStep === 3) {
        await fetch("/api/onboarding/session", { method: "DELETE" });
      }
      setActiveStep(activeStep === 2 ? 3 : 4);
      setMessage(
        activeStep === 2
          ? "Page 2 saved. The data table will show those updates now."
          : "Onboarding complete. The full record is saved."
      );
    } catch {
      setMessage("This step could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && activeStep === 4) {
    return (
      <main className="thank-you-screen">
        <h1>Thank you</h1>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Application navigation">
        <Link className="brand-mark" href="/">
          <span className="brand-icon">SIQ</span>
          <span>
            <strong>Support IQ</strong>
            <small>Onboarding</small>
          </span>
        </Link>
      </section>

      <section className="onboarding-layout">
        <HorizontalStepper activeStep={activeStep} />
        <section className="form-surface" aria-live="polite">
          {loading ? (
            <div className="loading-panel">Loading your onboarding flow...</div>
          ) : null}

          {!loading && activeStep === 1 ? (
            <form className="stack" onSubmit={submitAccount}>
              <div>
                <p className="eyebrow">Page 1 of 3</p>
                <h2>Create the user record</h2>
              </div>

              <label className="field">
                <span>Email</span>
                <span className="input-with-icon">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={form.email}
                  />
                </span>
              </label>

              <label className="field">
                <span>Password</span>
                <span className="input-with-icon">
                  <Lock size={18} aria-hidden="true" />
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="At least 8 characters"
                    required
                    type="password"
                    value={form.password}
                  />
                </span>
              </label>

              <FormActions
                message={message}
                primaryLabel="Save and continue"
                submitting={submitting}
              />
            </form>
          ) : null}

          {!loading && (activeStep === 2 || activeStep === 3) ? (
            <form className="stack" onSubmit={submitProfileStep}>
              <div>
                <p className="eyebrow">Page {activeStep} of 3</p>
                <h2>{activeStep === 2 ? "Profile details" : "Final details"}</h2>
                <p className="form-copy">
                  This page is assembled from the components currently assigned
                  in the admin area.
                </p>
              </div>

              <div className="component-stack">
                {visibleComponents.map((component) => (
                  <ComponentFields
                    component={component}
                    form={form}
                    key={component.key}
                    setForm={setForm}
                  />
                ))}
              </div>

              <div className="button-row">
                <button
                  className="secondary-button"
                  onClick={() => setActiveStep(activeStep === 3 ? 2 : 1)}
                  type="button"
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  Back
                </button>
                <button className="primary-button" disabled={submitting} type="submit">
                  {activeStep === 2 ? "Save page 2" : "Complete onboarding"}
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>

              {message ? <p className="status-message">{message}</p> : null}
            </form>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function HorizontalStepper({ activeStep }: { activeStep: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="horizontal-stepper" aria-label="Onboarding progress">
      {STEP_LABELS.map((step, index) => {
        const isActive = activeStep === step.number;
        const isDone = activeStep > step.number;
        return (
          <li
            className={`${isActive ? "is-active" : ""} ${
              isDone ? "is-done" : ""
            }`}
            key={step.number}
          >
            <span className="step-number">
              {isDone ? <Check size={15} aria-hidden="true" /> : step.number}
            </span>
            <span className="step-copy">
              <small>{step.label}</small>
              <strong>{step.title}</strong>
            </span>
            {index < STEP_LABELS.length - 1 ? (
              <span className="step-connector" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ComponentFields({
  component,
  form,
  setForm,
}: {
  component: ConfigItem;
  form: FormData;
  setForm: Dispatch<SetStateAction<FormData>>;
}) {
  if (component.key === "aboutMe") {
    return (
      <fieldset className="component-fieldset">
        <legend>
          <UserRound size={18} aria-hidden="true" />
          About Me
        </legend>
        <label className="field">
          <span>Personal introduction</span>
          <textarea
            minLength={10}
            onChange={(event) =>
              setForm((current) => ({ ...current, aboutMe: event.target.value }))
            }
            placeholder="Share your background, goals, or support preferences."
            required
            rows={6}
            value={form.aboutMe}
          />
        </label>
      </fieldset>
    );
  }

  if (component.key === "address") {
    return (
      <fieldset className="component-fieldset">
        <legend>
          <MapPin size={18} aria-hidden="true" />
          Address
        </legend>
        <div className="address-grid">
          <label className="field span-2">
            <span>Street address</span>
            <input
              autoComplete="street-address"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  streetAddress: event.target.value,
                }))
              }
              placeholder="123 Market Street"
              required
              value={form.streetAddress}
            />
          </label>
          <label className="field">
            <span>City</span>
            <input
              autoComplete="address-level2"
              onChange={(event) =>
                setForm((current) => ({ ...current, city: event.target.value }))
              }
              placeholder="Austin"
              required
              value={form.city}
            />
          </label>
          <label className="field">
            <span>State</span>
            <input
              autoComplete="address-level1"
              onChange={(event) =>
                setForm((current) => ({ ...current, state: event.target.value }))
              }
              placeholder="TX"
              required
              value={form.state}
            />
          </label>
          <label className="field">
            <span>ZIP</span>
            <input
              autoComplete="postal-code"
              inputMode="numeric"
              onChange={(event) =>
                setForm((current) => ({ ...current, zip: event.target.value }))
              }
              placeholder="78701"
              required
              value={form.zip}
            />
          </label>
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="component-fieldset">
      <legend>
        <CalendarDays size={18} aria-hidden="true" />
        Birthdate
      </legend>
      <label className="field">
        <span>Date of birth</span>
        <input
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) =>
            setForm((current) => ({ ...current, birthdate: event.target.value }))
          }
          required
          type="date"
          value={form.birthdate}
        />
      </label>
    </fieldset>
  );
}

function FormActions({
  message,
  primaryLabel,
  submitting,
}: {
  message: string;
  primaryLabel: string;
  submitting: boolean;
}) {
  return (
    <>
      <button className="primary-button" disabled={submitting} type="submit">
        {primaryLabel}
        <ChevronRight size={17} aria-hidden="true" />
      </button>
      {message ? <p className="status-message">{message}</p> : null}
    </>
  );
}

function fromUser(user: UserRecord): FormData {
  return {
    email: user.email,
    password: "",
    aboutMe: user.aboutMe,
    streetAddress: user.streetAddress,
    city: user.city,
    state: user.state,
    zip: user.zip,
    birthdate: user.birthdate,
  };
}

function validateVisibleComponents(components: ConfigItem[], form: FormData) {
  for (const component of components) {
    if (component.key === "aboutMe" && form.aboutMe.trim().length < 10) {
      return "Tell us a little more in About Me.";
    }

    if (component.key === "address") {
      if (
        !form.streetAddress.trim() ||
        !form.city.trim() ||
        !form.state.trim() ||
        !form.zip.trim()
      ) {
        return "Complete every address field before continuing.";
      }
    }

    if (component.key === "birthdate" && !form.birthdate) {
      return "Choose a birthdate before continuing.";
    }
  }

  return null;
}
