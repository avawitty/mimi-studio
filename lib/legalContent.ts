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
  subtitle: "How we care for your information",
  lastUpdated: "August 2, 2026",
  contactEmail: LEGAL_CONTACT_EMAIL,
  sections: [
    {
      id: "overview",
      title: "A plain-language start",
      body:
        "Hi — welcome to Mimi (mimi.you). This page explains what information we collect, why we need it, and the choices you have.\n\nWe built Mimi as a creative studio, not a data broker. We do not sell your personal information. If anything here feels unclear, email us at privacy@mimi.you and we will help.",
    },
    {
      id: "controller",
      title: "Who is responsible",
      body:
        "Mimi is responsible for the personal information described in this policy. For privacy questions or requests, write to privacy@mimi.you.\n\nIf you use Mimi through a partner embed or another site, that partner’s terms may also apply.",
    },
    {
      id: "collected",
      title: "What we collect",
      body:
        "Account details: When you sign in (Google, email link, or guest mode), we receive a Firebase user ID. We may also store a display name, handle, avatar, and email if you share them.\n\nYour creative work: Text, images, links, zines, pocket items, Tailor drafts, and other things you create or upload.\n\nAI prompts and results: The prompts, settings, and model responses involved when you use Mimi’s AI features.\n\nUsage and diagnostics: Feature interactions, session metadata, error logs, and performance signals that help us keep the product working.\n\nCookies and local storage: An HttpOnly __session cookie for secure server routes; Firebase sign-in persistence; theme and UI preferences; draft autosave; and optional analytics only if you opt in. See “Cookies & similar tools” below.",
    },
    {
      id: "sources",
      title: "How we get it",
      body:
        "From you, when you create an account, edit your profile, generate content, export work, or contact us.\n\nAutomatically, through Firebase Authentication, Firestore, Cloud Storage, and our hosting when you use the app.\n\nFrom sign-in providers (for example Google), based on their policies and the permissions you grant.\n\nFrom integrations you choose to use. Shopify publishing credentials live in Mimi’s server environment and are not collected through the browser.",
    },
    {
      id: "use",
      title: "How we use it",
      body:
        "We use your information to:\n\n• Run and improve Mimi’s creative tools\n\n• Sign you in and keep your account and cloud archive secure\n\n• Generate the AI-assisted outputs you ask for\n\n• Sync your zines, pocket, and profile across devices when you are signed in\n\n• Show public profiles and shared zines only when you choose to publish them\n\n• Understand product health and fix bugs (analytics only with your consent)\n\n• Follow the law and enforce our Terms of Service\n\nWe do not use your private creative archives to train public foundation models.",
    },
    {
      id: "ai",
      title: "AI processing",
      body:
        "When you use generation features, your inputs are sent to AI providers (primarily Google Gemini via Firebase / Google Cloud) so we can return results. If you add your own API key (BYOK), requests may go from your browser to that provider under your account.\n\nAI outputs can be wrong or incomplete. Please review them before publishing or using them commercially. Avoid pasting sensitive personal information you would not want those processors to see.",
    },
    {
      id: "sharing",
      title: "Who we share with",
      body:
        "We share data only as needed to operate Mimi:\n\n• Google / Firebase — sign-in, Firestore, Cloud Storage, and (if you consent) Firebase Analytics\n\n• Vercel — hosting, serverless API routes, and session cookies in production\n\n• Google Cloud / Gemini — AI inference for features you use\n\n• Shopify — only when an authorized creator publishes or uses Shopify discovery. Store credentials stay server-side; approved product data is sent for that handoff\n\n• Payment partners — if you subscribe, they handle billing; we receive subscription status, not full card numbers\n\nWe may also share information if the law requires it, or to protect people, Mimi, or the public from serious harm.",
    },
    {
      id: "public",
      title: "What stays private vs public",
      body:
        "Public handles (for example mimi.you/u/your-handle), public zines, and share links show only what you publish. We show your chosen handle and public work — not your full internal user ID.\n\nPlease check visibility settings before you share.",
    },
    {
      id: "retention",
      title: "How long we keep it",
      body:
        "We keep account and cloud archive data while your account is active. Guest or local-only data stays in your browser until you clear it. Session cookies follow Firebase session settings (often up to about two weeks of inactivity).\n\nYou can delete content from your archive, or ask us to delete your account, by emailing privacy@mimi.you. Backups and logs may remain for a limited time afterward for security and legal reasons.",
    },
    {
      id: "rights",
      title: "Your rights and choices",
      body:
        "Depending on where you live, you may have rights to access, correct, delete, or export your personal data; to object to or limit certain processing; and to withdraw consent for non-essential cookies or analytics at any time through the cookie banner or your browser settings.\n\nTo make a request, email privacy@mimi.you from the address tied to your account. We may need to verify it is you before we respond.",
    },
    {
      id: "cookies",
      title: "Cookies & similar tools",
      body:
        "Essential (always on): the __session HttpOnly cookie for secure server auth; Firebase sign-in persistence; and storage needed for security and core app function.\n\nFunctional (local): theme, drafts, UI mode, and feature flags in localStorage so your studio state sticks around.\n\nAnalytics (opt-in only): Firebase Analytics and affiliate click measurement load only if you choose “Accept all” in the cookie banner. “Essential only” keeps sign-in working and turns off optional tracking.",
    },
    {
      id: "security",
      title: "How we protect it",
      body:
        "We use HTTPS, HttpOnly session cookies, Firebase security rules, and standard access controls. No system is perfectly secure, so please use a strong sign-in method and take care of your device.",
    },
    {
      id: "children",
      title: "Children",
      body:
        "Mimi is not directed to children under 13 (or the minimum age where you live). We do not knowingly collect personal information from children. If you think a child has shared data with us, please contact us and we will take care of it.",
    },
    {
      id: "changes",
      title: "Updates to this policy",
      body:
        "We may update this policy as Mimi grows. When we do, we will post the new version at mimi.you/privacy with a fresh “Last updated” date. Continued use after a change means you accept the updated policy.",
    },
    {
      id: "contact",
      title: "Talk to us",
      body:
        "Questions or requests: privacy@mimi.you\n\nMimi — mimi.you",
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  subtitle: "A fair agreement for using Mimi",
  lastUpdated: "August 2, 2026",
  contactEmail: LEGAL_CONTACT_EMAIL,
  sections: [
    {
      id: "acceptance",
      title: "By using Mimi",
      body:
        "When you use Mimi at mimi.you, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.\n\nWe wrote these terms to be clear. They still matter legally — please read them.",
    },
    {
      id: "service",
      title: "What Mimi is",
      body:
        "Mimi is a creative studio for gathering inspiration, making zines and related work, organizing your archive, and optionally publishing or exporting what you make.\n\nFeatures can change. Some tools may be experimental. We may update or retire parts of the service, and we will give reasonable notice when we can.",
    },
    {
      id: "accounts",
      title: "Your account",
      body:
        "You are responsible for your sign-in method and for activity under your account. Guest sessions are temporary; signed-in accounts can sync to the cloud.\n\nPlease keep your handle and profile lawful and accurate. We may suspend or close accounts that break these Terms.",
    },
    {
      id: "your-content",
      title: "Your work belongs to you",
      body:
        "You keep ownership of what you create or upload (“Your Content”).\n\nYou give Mimi a limited, worldwide, non-exclusive license to host, store, reproduce, and display Your Content only as needed to run and improve the service — including showing work you choose to publish.\n\nYou confirm you have the rights to upload and share Your Content, and that it does not infringe someone else’s rights.",
    },
    {
      id: "ai-content",
      title: "AI-generated content",
      body:
        "Outputs from Mimi’s AI features are generated automatically. They can be wrong, biased, or similar to existing work. AI output is provided “as is.”\n\nYou are responsible for reviewing, editing, and deciding how to use AI-generated material — including for commercial, editorial, or public use. We do not guarantee uniqueness, accuracy, or fitness for a particular purpose.",
    },
    {
      id: "acceptable-use",
      title: "Please be good to the space",
      body:
        "We ask that you do not: break the law or others’ rights; upload malware or try to disrupt Mimi; scrape or overload systems without permission; impersonate people; harass or threaten; share illegal or exploitative content; harvest other people’s private archives to build competing datasets; or dodge security or usage limits.\n\nBold creative work is welcome. Harm is not.",
    },
    {
      id: "third-party",
      title: "Other services & your own API keys",
      body:
        "Mimi works with third parties such as Google/Firebase, Vercel, AI providers, optional Shopify, and payment processors. Using those services may also mean accepting their terms.\n\nIf you bring your own API keys, you are responsible for any charges and for following that provider’s rules.",
    },
    {
      id: "payments",
      title: "Paid plans",
      body:
        "If you choose a paid plan, you will be billed according to the price shown at purchase. Fees are generally non-refundable except where the law requires otherwise.\n\nWe may change pricing with notice. If you keep using a paid plan after a change, that applies to future renewal periods.",
    },
    {
      id: "termination",
      title: "Leaving Mimi",
      body:
        "You can stop using Mimi whenever you like. We may suspend or end access if these Terms are broken, if the platform is at risk, or after long inactivity.\n\nWhen access ends, your right to use the service ends. We may delete cloud data following the retention rules in our Privacy Policy.",
    },
    {
      id: "disclaimer",
      title: "No perfect guarantees",
      body:
        "Mimi is provided “as is” and “as available.” To the fullest extent allowed by law, we disclaim warranties of any kind — including merchantability, fitness for a particular purpose, and non-infringement. We do not promise uninterrupted or error-free service.",
    },
    {
      id: "liability",
      title: "Limits on liability",
      body:
        "To the maximum extent permitted by law, Mimi and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill, arising from your use of the service.\n\nOur total liability for any claim relating to the service is limited to the greater of (a) what you paid Mimi in the twelve months before the claim, or (b) USD $100.",
    },
    {
      id: "indemnity",
      title: "If something goes wrong because of your use",
      body:
        "You agree to protect and hold Mimi harmless from claims that arise from Your Content, your use of the service, or your violation of these Terms or the law.",
    },
    {
      id: "law",
      title: "Governing law",
      body:
        "These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules, except where stronger consumer protections where you live must apply.\n\nDisputes will be handled in the courts of San Francisco County, California, unless the law requires otherwise.",
    },
    {
      id: "contact",
      title: "Questions",
      body:
        "Legal questions: privacy@mimi.you\n\nMimi — mimi.you\n\nYou can always read the Privacy Policy at /privacy and these Terms at /tos.",
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

/** Canonical path for a legal document (`/privacy` or `/tos`). */
export function legalPathFor(type: LegalDocumentType): string {
  switch (type) {
    case "privacy":
      return "/privacy";
    case "terms":
      return "/tos";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Resolve a pathname to a legal document type, if any. */
export function legalTypeFromPath(pathname: string): LegalDocumentType | null {
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/tos" || pathname === "/terms") return "terms";
  return null;
}
