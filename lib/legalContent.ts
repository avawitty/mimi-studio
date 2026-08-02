export type LegalDocumentType = "privacy" | "terms";

export interface LegalSection {
  id: string;
  title: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactEmail: string;
}

export const LEGAL_CONTACT_EMAIL = "privacy@mimi.you";

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  subtitle: "How Mimi handles your debris",
  lastUpdated: "July 11, 2026",
  contactEmail: LEGAL_CONTACT_EMAIL,
  sections: [
    {
      id: "overview",
      title: "Overview",
      body:
        "Mimi (“Mimi,” “we,” “us”) operates at mimi.you and related subdomains. This Privacy Policy explains what information we collect, why we collect it, how we use and share it, and the choices you have. We built Mimi as a creative studio—not a data broker. We do not sell your personal information.",
    },
    {
      id: "controller",
      title: "Who Is Responsible",
      body:
        "Mimi is the data controller for processing described in this policy. For privacy requests, contact us at privacy@mimi.you. If you use Mimi through a third-party embed or partner, their terms may also apply.",
    },
    {
      id: "collected",
      title: "Information We Collect",
      body:
        "Account & identity: When you sign in (Google, email link, or guest mode), we receive a Firebase user identifier, and may store your display name, handle, avatar URL, and email if you provide it.\n\nCreative content: Text, images, links, zines, pocket items, tailor drafts, and other artifacts you create or upload.\n\nAI inputs & outputs: Prompts, generation settings, and model responses sent through Mimi’s AI features (Google Gemini and, if you configure them, your own API keys).\n\nUsage & diagnostics: Feature interactions, taste signals, session metadata, error logs, and performance data needed to operate the service.\n\nCookies & local storage: An HttpOnly __session cookie for authenticated server routes; Firebase auth persistence; theme and UI preferences; draft autosave; optional analytics when you opt in. See “Cookies & Similar Technologies.”",
    },
    {
      id: "sources",
      title: "How We Collect Information",
      body:
        "Directly from you when you create an account, edit your profile, generate content, export artifacts, or contact support.\n\nAutomatically through Firebase Authentication, Firestore, Cloud Storage, and our hosting infrastructure when you use the app.\n\nFrom third-party sign-in providers (e.g., Google) according to their policies and the permissions you grant.\n\nFrom optional integrations you enable. Shopify publishing credentials are configured in Mimi's server environment and are not collected through the browser.",
    },
    {
      id: "use",
      title: "How We Use Information",
      body:
        "Provide, maintain, and improve Mimi’s creative tools.\n\nAuthenticate you and secure your account and cloud archive.\n\nGenerate AI-assisted outputs you request.\n\nSync your zines, pocket, and profile across devices when you are signed in.\n\nShow public profiles and shared zines only when you choose to publish them.\n\nMeasure product health and fix bugs (analytics only with your consent).\n\nComply with law and enforce our Terms of Service.\n\nWe do not use your private creative archives to train public foundation models.",
    },
    {
      id: "ai",
      title: "AI Processing",
      body:
        "When you use generation features, your inputs are sent to AI providers (primarily Google Gemini via Firebase/Google Cloud) to produce outputs. If you supply your own API key (BYOK), requests may go directly from your browser to that provider under your account. AI outputs may be inaccurate or incomplete—you are responsible for reviewing them before publishing or commercial use. Do not submit sensitive personal data you are not comfortable sharing with these processors.",
    },
    {
      id: "sharing",
      title: "Sharing & Third Parties",
      body:
        "We share data only as needed to run Mimi:\n\n• Google / Firebase — authentication, Firestore database, Cloud Storage, and (if consented) Firebase Analytics.\n\n• Vercel — application hosting, serverless API routes, and session cookie handling in production.\n\n• Google Cloud / Gemini — AI inference for features you invoke.\n\n• Shopify — only when an authorized creator explicitly publishes a draft or uses Shopify discovery. Store credentials remain server-side; approved product data and provenance are sent to Shopify for the requested handoff.\n\n• Payment processors — if you subscribe to paid plans, billing is handled by our payment partner; we receive subscription status, not full card numbers.\n\nWe may disclose information if required by law or to protect users, Mimi, or the public from harm.",
    },
    {
      id: "public",
      title: "Public Profiles & Sharing",
      body:
        "Handles (e.g., mimi.you/u/your-handle), public zines, and share links expose only what you publish. We display your chosen handle and public artifacts—not your full internal user ID. Review visibility settings before sharing.",
    },
    {
      id: "retention",
      title: "Retention",
      body:
        "We retain account and cloud archive data while your account is active. Guest/local-only data lives in your browser until you clear it. Session cookies expire per Firebase session settings (typically up to two weeks of inactivity). You may delete content from your archive or request account deletion by contacting privacy@mimi.you. Backups and logs may persist for a limited period after deletion for security and legal compliance.",
    },
    {
      id: "rights",
      title: "Your Rights & Choices",
      body:
        "Depending on your location, you may have rights to access, correct, delete, or export personal data; object to or restrict certain processing; and withdraw consent for non-essential cookies/analytics at any time via the cookie banner or browser settings.\n\nTo exercise rights, email privacy@mimi.you with the address tied to your account. We may verify your identity before responding.",
    },
    {
      id: "cookies",
      title: "Cookies & Similar Technologies",
      body:
        "Essential (always on): __session HttpOnly cookie for secure server auth; Firebase authentication persistence; storage needed for sign-in, security, and core app function.\n\nFunctional (local): theme, drafts, UI mode, and feature flags stored in localStorage to preserve your studio state.\n\nAnalytics (opt-in only): Firebase Analytics and affiliate click measurement load only if you choose “Accept all” in the cookie banner. Choosing “Essential only” keeps auth working and disables optional tracking.",
    },
    {
      id: "security",
      title: "Security",
      body:
        "We use HTTPS, HttpOnly session cookies, Firebase security rules, and industry-standard access controls. No method of transmission or storage is perfectly secure; please use a strong account method and protect your device.",
    },
    {
      id: "children",
      title: "Children",
      body:
        "Mimi is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children. Contact us if you believe a child has provided data.",
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      body:
        "We may update this policy as Mimi evolves. We will post the revised version at mimi.you/privacy with an updated “Last updated” date. Continued use after changes means you accept the updated policy.",
    },
    {
      id: "contact",
      title: "Contact",
      body:
        "Questions or requests: privacy@mimi.you\n\nMimi — mimi.you",
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  subtitle: "Rules for the vault",
  lastUpdated: "July 11, 2026",
  contactEmail: LEGAL_CONTACT_EMAIL,
  sections: [
    {
      id: "acceptance",
      title: "Acceptance",
      body:
        "By accessing or using Mimi at mimi.you, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the service.",
    },
    {
      id: "service",
      title: "The Service",
      body:
        "Mimi provides creative tools to collect inspiration, generate zines and related artifacts, organize archives, and optionally publish or export work. Features may change, beta features may be unstable, and we may modify or discontinue parts of the service with reasonable notice where practicable.",
    },
    {
      id: "accounts",
      title: "Accounts",
      body:
        "You are responsible for your account credentials and activity under your account. Guest sessions are ephemeral; anchored accounts sync to the cloud. You must provide accurate information and keep your handle and profile lawful. We may suspend or terminate accounts that violate these Terms.",
    },
    {
      id: "your-content",
      title: "Your Content & Ownership",
      body:
        "You retain ownership of content you create or upload (“Your Content”). You grant Mimi a limited, worldwide, non-exclusive license to host, store, reproduce, and display Your Content solely to operate and improve the service—including showing public artifacts you explicitly publish. You represent that you have the rights to upload and share Your Content and that it does not infringe others’ rights.",
    },
    {
      id: "ai-content",
      title: "AI-Generated Content",
      body:
        "Outputs from Mimi’s AI features are generated automatically and may be wrong, biased, or similar to existing works. AI output is provided “as is.” You are solely responsible for reviewing, editing, and deciding how to use AI-generated material, including for commercial, editorial, or public distribution. Mimi does not guarantee uniqueness, accuracy, or fitness for a particular purpose.",
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use",
      body:
        "You agree not to: violate law or others’ rights; upload malware or attempt to disrupt Mimi; scrape or overload systems without permission; impersonate others; harass or threaten; distribute illegal or exploitative content; use the service to build competing datasets from other users’ private archives; or circumvent security or usage limits. Creative audacity is welcome; malice is not.",
    },
    {
      id: "third-party",
      title: "Third-Party Services & BYOK",
      body:
        "Mimi integrates with third parties (Google/Firebase, Vercel, AI providers, optional Shopify, payment processors). Your use of those services may be subject to their terms. If you provide your own API keys, you are responsible for charges and compliance with that provider’s policies.",
    },
    {
      id: "payments",
      title: "Subscriptions & Payments",
      body:
        "Paid plans, if offered, bill according to the pricing shown at purchase. Fees are non-refundable except where required by law. We may change pricing with notice; continued use after a change constitutes acceptance for renewal periods.",
    },
    {
      id: "termination",
      title: "Suspension & Termination",
      body:
        "You may stop using Mimi at any time. We may suspend or terminate access for violations of these Terms, risk to the platform, or prolonged inactivity. Upon termination, your right to use the service ends; we may delete cloud data per our Privacy Policy retention rules.",
    },
    {
      id: "disclaimer",
      title: "Disclaimers",
      body:
        "MIMI IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT UNINTERRUPTED OR ERROR-FREE OPERATION.",
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      body:
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, MIMI AND ITS OPERATORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID MIMI IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) USD $100.",
    },
    {
      id: "indemnity",
      title: "Indemnity",
      body:
        "You will indemnify and hold harmless Mimi from claims arising out of Your Content, your use of the service, or your violation of these Terms or applicable law.",
    },
    {
      id: "law",
      title: "Governing Law",
      body:
        "These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules, except where mandatory consumer protections in your country apply. Disputes will be resolved in the courts of San Francisco County, California, unless otherwise required by law.",
    },
    {
      id: "contact",
      title: "Contact",
      body:
        "Legal inquiries: privacy@mimi.you\n\nMimi — mimi.you",
    },
  ],
};

export function getLegalDocument(type: LegalDocumentType): LegalDocument {
  switch (type) {
    case "privacy":
      return PRIVACY_POLICY;
    case "terms":
      return TERMS_OF_SERVICE;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
