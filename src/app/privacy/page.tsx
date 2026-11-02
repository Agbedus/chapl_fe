import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CrossRule } from "@/components/dot-cross";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Privacy policy — Chapl",
  description:
    "What Chapl collects for your church, who can see it, how long it is kept, and how to delete your account.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "2 November 2026";

/**
 * What only a person can decide: who the operator is in law, where to
 * write, and which country's rules apply. Each is `null` until it is
 * decided, and a `null` renders as a marked gap rather than as a guess,
 * so the page cannot pass for finished while any are left. The store
 * listings link here (`PRIVACY_POLICY_URL` in the phone app), and the
 * whole page still wants a legal read before the first submission.
 */
const FILL: Record<string, string | null> = {
  operator: null, // the legal entity that runs Chapl
  address: null, // its postal address
  contact: null, // the support address, once it exists
  email: null, // the email delivery provider
  backups: null, // how long database backups are kept
  age: null, // the minimum age without a parent's or church's involvement
  law: null, // the data protection laws Chapl answers to, and the regulator
};

const LABELS: Record<keyof typeof FILL, string> = {
  operator: "legal name of the operator",
  address: "postal address",
  contact: "support email address",
  email: "email delivery provider",
  backups: "backup retention period",
  age: "minimum age",
  law: "applicable law and regulator",
};

const DRAFT = Object.values(FILL).some((value) => value === null);

/** A decided value, or a gap that says what belongs in it. */
function Fill({ name }: { name: keyof typeof FILL }) {
  const value = FILL[name];
  if (value) return <>{value}</>;
  return (
    <span className="rounded-[4px] border border-dashed border-ruby/60 bg-ruby/10 px-1.5 py-px text-[0.92em] text-ruby">
      [{LABELS[name]}]
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="head mt-12 text-[22px] text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-[1.7] text-ink-2">{children}</div>
    </section>
  );
}

/** One row of "what we collect": the thing, then why. */
function Item({ what, children }: { what: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-line py-3.5 sm:grid-cols-[13rem_1fr] sm:gap-6">
      <dt className="text-[14px] font-semibold text-ink">{what}</dt>
      <dd className="text-[14.5px] leading-[1.65] text-ink-2">{children}</dd>
    </div>
  );
}

/**
 * The privacy policy, public, for the App Store and Google Play listings
 * and for anyone a church invites. Written from what the API, the phone
 * app and this site actually store and send; when one of them starts
 * collecting something new, this page is part of that change.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteNav sections={false} />
      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
          <p className="eyebrow text-cobalt">Privacy</p>
          <h1 className="head mt-3 text-[clamp(2rem,5vw,2.75rem)] text-ink">Privacy policy</h1>
          <p className="mt-3 text-[13.5px] text-ink-3">Last updated {LAST_UPDATED}</p>

          {DRAFT && (
            <p className="mt-6 rounded-[12px] border border-dashed border-ruby/50 bg-ruby/5 px-4 py-3 text-[13.5px] leading-[1.6] text-ink-2">
              This policy is being finalised. The marked gaps are details still to be confirmed.
            </p>
          )}

          <div className="mt-8 space-y-4 text-[16px] leading-[1.7] text-ink-2">
            <p>
              Chapl is an app for churches and their members: the church keeps its people, branches,
              cells and Sundays in it, and members use it to check in, hear sermons, see what is on and
              ask for prayer. This policy explains what Chapl holds about you, why, who can see it, and
              how to delete it. It covers the Chapl phone app and this website.
            </p>
            <p>
              Chapl is run by <Fill name="operator" />, <Fill name="address" /> (&ldquo;we&rdquo;). You
              can reach us at <Fill name="contact" />.
            </p>
          </div>

          <Section id="who" title="Who holds your information">
            <p>
              Chapl works for your <strong className="text-ink">church</strong>. You are on Chapl
              because your church invited you, or because you registered a church yourself. Your church
              decides what it records about its members and is responsible for that; we hold it for
              them and run the service it lives in.
            </p>
            <p>
              Your details are stored on our servers with Render, in Frankfurt, Germany. This website is
              served by Vercel.
            </p>
          </Section>

          <Section id="collect" title="What we collect">
            <dl className="border-b border-line">
              <Item what="Your account">
                Email address, name and password. The password is stored only as a one-way hash; nobody
                at Chapl or your church can read it.
              </Item>
              <Item what="Contact details">
                Phone number, address, town and an emergency contact, which you or your church add, so
                the church can reach you.
              </Item>
              <Item what="Profile details">
                Date of birth, gender, marital status, occupation, and baptism and confirmation dates,
                where your church records them, for pastoral care and church records.
              </Item>
              <Item what="Your photo">
                If you choose to add one. The app only opens your photos when you pick one.
              </Item>
              <Item what="Church membership">
                Which church, branch and cell you belong to, any ministry teams you serve in, your
                household, and roles you hold. Belonging to a church can reveal your{" "}
                <strong className="text-ink">religious beliefs</strong>.
              </Item>
              <Item what="Attendance">
                Services and meetings you were marked present or absent at, whether a leader marked the
                register or you checked in with the code shown at the service.
              </Item>
              <Item what="At the service">
                Your answers to questions asked in the room. They are stored against you so you can
                change your answer; everyone else sees only the totals.
              </Item>
              <Item what="Care and follow-up">
                Prayer and call requests you send, and notes leaders record when they check on you. These
                can include sensitive personal matters.
              </Item>
              <Item what="Giving">
                Gifts your church records against you: the amount, date and what it was for. Chapl does
                not take payments or hold card or bank details. A gift marked anonymous is kept against
                you but left off what others see.
              </Item>
              <Item what="Things you do in the app">
                Events you sign up for and reminders you set, sermons you save, and birthday wishes you
                send (the person you send one to sees your name and message).
              </Item>
              <Item what="Security records">
                Sign-in attempts, with the email address used and the network (IP) address they came
                from, to slow down password guessing; and a record of changes made to church records and
                who made them.
              </Item>
            </dl>

            <p>
              <strong className="text-ink">On your phone</strong>, the app keeps your sign-in in the
              device&rsquo;s secure storage, your email for the next sign-in, your chosen church, and
              display settings. It schedules event reminders on the phone itself. It does not use your
              location, contacts, microphone or camera.
            </p>
            <p>
              <strong className="text-ink">On this website</strong>, signing in sets a cookie that holds
              your session and another that remembers which church you are looking at. Your choice of
              light or dark theme and similar display settings are kept in your browser. We use no
              advertising or analytics cookies.
            </p>
          </Section>

          <Section id="dont" title="What we don't do">
            <ul className="list-disc space-y-2 pl-5">
              <li>No advertising, and we never sell or rent your information.</li>
              <li>No tracking you across other apps or websites.</li>
              <li>
                No analytics or crash-reporting services. Apple and Google may share crash reports with
                us if you allow it in your phone&rsquo;s settings.
              </li>
            </ul>
          </Section>

          <Section id="who-sees" title="Who sees it">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-ink">Your church&rsquo;s leaders</strong>, as their role
                allows: your cell leader sees your cell, a branch pastor their branch, the church&rsquo;s
                administrators the church. Private care requests go only to pastors and administrators.
              </li>
              <li>
                <strong className="text-ink">Members of your cell</strong> see your name and photo, and
                your birthday (the day, not your age) on the church calendar.
              </li>
              <li>
                <strong className="text-ink">Chapl&rsquo;s team</strong>, to run and support the
                service.
              </li>
              <li>
                <strong className="text-ink">Service providers</strong> who run parts of it for us:
                Render (servers and database), Vercel (this website) and <Fill name="email" /> (email
                delivery). They handle your information only to provide that service.
              </li>
              <li>
                <strong className="text-ink">YouTube</strong>, when you play a sermon your church
                published there. The video is loaded from YouTube (in its privacy-enhanced mode on this
                website) under Google&rsquo;s privacy policy.
              </li>
            </ul>
            <p>We share your information with nobody else unless the law requires it.</p>
          </Section>

          <Section id="safe" title="Keeping it safe">
            <p>
              Everything travels encrypted over HTTPS. Passwords are stored as one-way hashes. A sign-in
              lasts at most two days, repeated wrong passwords lock the account for a while, and
              changing your password signs you out everywhere else.
            </p>
          </Section>

          <Section id="keep" title="How long we keep it">
            <p>
              For as long as you have an account. If you leave a church, the church keeps its own records
              of the time you were part of it, such as past attendance and giving. Backups of our
              database are kept for <Fill name="backups" /> and then overwritten.
            </p>
          </Section>

          <Section id="delete" title="Deleting your account">
            <p>
              In the app, go to <strong className="text-ink">Profile → Delete my account</strong>, read
              what will happen, and confirm with your password.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>You are signed out on every device straight away, and we email you to confirm.</li>
              <li>
                <strong className="text-ink">After 30 days</strong> your account is permanently
                deleted: your sign-in, your profile and contact details, your photo, and your sign-in
                history.
              </li>
              <li>
                Changed your mind? Sign in again with the same email and password before the 30 days are
                up and the deletion is cancelled.
              </li>
              <li>
                Your church keeps its records, such as attendance and giving, without your name on them.
              </li>
            </ul>
            <p>
              If you cannot use the app, email <Fill name="contact" /> from your account&rsquo;s address
              and we will do it for you.
            </p>
          </Section>

          <Section id="rights" title="Your rights">
            <p>
              You can see and correct your details in <strong className="text-ink">Profile</strong>,
              delete your account as described above, and ask us for a copy of what we hold about you or
              to restrict how it is used, by emailing <Fill name="contact" />.
            </p>
            <p>
              We handle your information under <Fill name="law" />. If you think we have got something
              wrong, tell us first; you may also complain to the regulator named there.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              Chapl is not meant for children under <Fill name="age" /> without a parent&rsquo;s or their
              church&rsquo;s involvement. If you believe a child has an account they should not have,
              contact us and we will remove it.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              We will post any change here and update the date at the top.
            </p>
          </Section>

          <div className="my-12">
            <CrossRule />
          </div>
          <p className="text-center text-[14px] text-ink-3">
            <Link href="/" className="font-medium text-ink hover:underline">
              Back to Chapl
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
