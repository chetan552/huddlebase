import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Shield, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | HuddleBase',
  description: 'Learn how HuddleBase collects, uses, and protects account, team, roster, schedule, message, payment, and analytics data.',
};

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      'Account information such as name, email address, role, profile photo, phone number, password credentials, and authentication provider details when you sign in with Google.',
      'Team and roster information such as team names, sports, seasons, player names, family links, jersey numbers, positions, attendance, RSVP status, volunteer signups, and player profile details entered by authorized users.',
      'Communication and activity data such as team messages, announcements, notifications, schedule updates, event notes, uploaded files, and actions taken inside the app.',
      'Payment records such as invoices, payment status, payment method labels, and related bookkeeping details. HuddleBase should not be used to store full card numbers or sensitive payment credentials.',
      'Technical data such as device/browser information, IP-derived security signals, session tokens, logs, and usage information needed to operate, secure, and improve the service.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'To provide the core HuddleBase experience, including authentication, team management, scheduling, chat, attendance, RSVP, roster, analytics, notifications, and payment tracking.',
      'To personalize dashboards by user role, team membership, family relationship, notification state, and account settings.',
      'To send transactional communications such as invitations, password reset emails, event updates, announcements, invoice reminders, and security notices.',
      'To maintain security, prevent abuse, troubleshoot issues, debug errors, enforce permissions, and improve product reliability.',
      'To generate practice planning or analytics outputs when users submit relevant team, sport, or session details to those features.',
    ],
  },
  {
    title: 'How Information Is Shared',
    body: [
      'Team information is shared with users who have permission to access the relevant team, such as coaches, players, parents, managers, and administrators.',
      'Parents may see child-related team, schedule, RSVP, attendance, invoice, and notification information when a family link exists.',
      'Service providers may process information for hosting, database storage, email delivery, authentication, file storage, analytics, payment workflows, or AI features, only as needed to operate HuddleBase.',
      'Information may be disclosed if required by law, to protect rights and safety, to investigate abuse, or as part of a business transfer such as a merger or acquisition.',
      'We do not sell personal information.',
    ],
  },
  {
    title: 'Children and Family Data',
    body: [
      'HuddleBase may contain information about youth athletes when parents, guardians, coaches, or team administrators enter that information.',
      'Coaches and team administrators are responsible for collecting any required consent before adding youth roster, medical, emergency contact, attendance, or performance information.',
      'Parents or guardians may request access, correction, or deletion of child-related information, subject to team recordkeeping, safety, and legal requirements.',
      'Sensitive details such as medical notes and emergency contacts should be limited to what is necessary for team operations and safety.',
    ],
  },
  {
    title: 'Data Retention and Security',
    body: [
      'We keep information as long as needed to provide HuddleBase, maintain team records, comply with obligations, resolve disputes, and enforce agreements.',
      'Account sessions use signed tokens and protected cookies for web access. Passwords are hashed before storage. Access to team data is controlled by user role and team membership.',
      'No system can be guaranteed completely secure. Users should choose strong passwords, protect account access, and promptly report suspected unauthorized activity.',
      'Uploaded files and profile photos should not include sensitive information unless it is necessary for the team purpose and authorized by the relevant person or guardian.',
    ],
  },
  {
    title: 'Your Choices and Rights',
    body: [
      'You can update your profile name and avatar in Settings. You can also request password resets and configure account security options where available.',
      'You may delete your account from Settings or ask to access, correct, export, or delete personal information, subject to identity verification and legal or operational limits.',
      'Team members should contact their coach or team administrator for team-level corrections, roster updates, family link changes, or removal from a team.',
      'You can opt out of non-essential communications where available, but transactional notices may still be sent when needed for service, security, or team operations.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions or requests, contact the HuddleBase operator or organization that manages your account. If you are running this deployment, replace this section with your legal contact email, mailing address, and any region-specific privacy disclosures before launch.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <Link href="/" className="landing-logo">
          <span className="landing-logo__icon"><Zap size={20} /></span>
          <span className="landing-logo__text">HuddleBase</span>
        </Link>
        <Link href="/" className="btn btn-outline btn-sm">
          <ArrowLeft size={15} />
          Back Home
        </Link>
      </nav>

      <section className="legal-hero">
        <div className="legal-hero__badge">
          <Shield size={15} />
          Privacy and data use
        </div>
        <h1>Privacy Policy</h1>
        <p>
          This policy explains how HuddleBase handles information for coaches, players,
          parents, team administrators, and other users of the web and mobile app.
        </p>
        <div className="legal-meta">Effective date: June 4, 2026</div>
      </section>

      <section className="legal-content">
        <div className="legal-callout">
          This page is a product-specific starting policy for HuddleBase. Have counsel review it
          before production launch, especially if your teams include minors or operate across
          different states or countries.
        </div>

        {SECTIONS.map((section) => (
          <article key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            <ul>
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
