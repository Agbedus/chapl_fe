import type { Metadata } from "next";
import Link from "next/link";

import { B, Bullets, Contact, Item, LEGAL, LegalPage, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy policy — Chapl",
  description:
    "What Chapl collects for your church, why, who can see it, how long it is kept, your rights, and how to delete your account.",
  alternates: { canonical: "/privacy" },
};

/**
 * The privacy policy, public, for the App Store and Google Play listings
 * and for anyone a church invites. Written from what the API, the phone
 * app and this site actually store and send; when one of them starts
 * collecting something new, this page is part of that change. Who runs
 * Chapl, and the law it answers to, come from `LEGAL`.
 */
export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy policy" path="/privacy">
      <p>
        Chapl is an app for churches and their members: the church keeps its people, branches,
        cells and Sundays in it, and members use it to check in, hear sermons, see what is on and
        ask for prayer. This policy explains what Chapl holds about you, why, who can see it, how
        long we keep it, and the choices and rights you have. It covers the Chapl phone apps and this
        website (together, &ldquo;Chapl&rdquo;).
      </p>
      <p>
        Chapl is run by {LEGAL.operator}, {LEGAL.address} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). For
        anything in this policy, write to <Contact />.
      </p>

      <Section id="glance" title="At a glance">
        <Bullets>
          <li>Your church puts you in Chapl; we run the service it lives in.</li>
          <li>We collect what is needed to run a church: who you are, where you belong, when you came, and what you ask for.</li>
          <li>Church leaders see what their role needs. Other members see very little.</li>
          <li>We never sell your information, show ads, or track you across other apps or sites.</li>
          <li>You can see, correct and delete your information. Account deletion is in the app and takes 30 days.</li>
        </Bullets>
      </Section>

      <Section id="scope" title="What this policy covers">
        <p>
          It covers personal information we handle through Chapl: the iPhone, iPad and Android apps, this
          website, and email we send or receive about them. It does not cover other sites and services Chapl
          links to, or what your church does outside Chapl, such as paper registers or its own website.
          Where this policy says &ldquo;personal information&rdquo; it means information that identifies you,
          or could reasonably be used to.
        </p>
      </Section>

      <Section id="who" title="Who is responsible for your information">
        <p>
          Chapl works for your <B>church</B>. You are on Chapl because your church invited you, or
          because you registered a church yourself. For the records your church keeps about its
          members — membership, attendance, giving, care notes — <B>your church is the data
          controller</B>: it decides what to record and why, and we process that information on its
          behalf and on its instructions. For your account itself, and for running, securing and
          improving Chapl, <B>we are the data controller</B>.
        </p>
        <p>
          If you have a question about what your church records about you, you can ask your church
          or us; we will pass a request on to your church where it is theirs to answer.
        </p>
      </Section>

      <Section id="collect" title="What we collect">
        <dl className="border-b border-line">
          <Item what="Your account">
            Email address, name and password. The password is stored only as a one-way hash; nobody at
            Chapl or your church can read it.
          </Item>
          <Item what="Contact details">
            Phone number, address, town and an emergency contact, which you or your church add, so the
            church can reach you.
          </Item>
          <Item what="Profile details">
            Date of birth, gender, marital status, occupation, and baptism and confirmation dates, where
            your church records them, for pastoral care and church records.
          </Item>
          <Item what="Your photo">
            If you choose to add one. The app only opens your photos when you pick one.
          </Item>
          <Item what="Church membership">
            Which church, branch and cell you belong to, any ministry teams you serve in, your household,
            and roles you hold. Belonging to a church can reveal your <B>religious beliefs</B>.
          </Item>
          <Item what="Attendance">
            Services and meetings you were marked present or absent at, whether a leader marked the
            register or you checked in with the code shown at the service.
          </Item>
          <Item what="At the service">
            Your answers to questions asked in the room. They are stored against you so you can change
            your answer; everyone else sees only the totals.
          </Item>
          <Item what="Care and follow-up">
            Prayer and call requests you send, and notes leaders record when they check on you. These
            can include sensitive personal matters, including about your health.
          </Item>
          <Item what="Giving">
            Gifts your church records against you: the amount, date and what it was for. Chapl does not
            take payments or hold card or bank details. A gift marked anonymous is kept against you but
            left off what others see.
          </Item>
          <Item what="Things you do in the app">
            Events you sign up for and reminders you set, sermons you save, notifications we send you,
            and birthday wishes you send (the person you send one to sees your name and message).
          </Item>
          <Item what="Other people's details">
            An emergency contact&rsquo;s name and number, and household members your church links to you.
            If you give us someone else&rsquo;s details, you confirm they know and are happy for you to.
          </Item>
          <Item what="Device information">
            Standard technical details sent with every request: app version, operating system, language and
            time zone, and the IP address. We use them to run, secure and fix Chapl, not to identify you
            across other services.
          </Item>
          <Item what="Notification settings">
            Whether you switched on Sunday reminders, which are scheduled on your phone. Where push
            notifications are offered and you allow them, a device token so Apple or Google can deliver them.
          </Item>
          <Item what="Messages to us">
            What you write when you email us, so we can answer.
          </Item>
          <Item what="Security records">
            Sign-in attempts, with the email address used and the network (IP) address they came from,
            to slow down password guessing; and a record of changes made to church records and who made
            them. Our hosting providers also keep short-lived server logs, which include IP addresses.
          </Item>
        </dl>

        <p>
          <B>On your phone</B>, the app keeps your sign-in in the device&rsquo;s secure storage, your
          email for the next sign-in, your chosen church, and display settings. It schedules event
          reminders on the phone itself. It does not use your location, contacts, microphone or camera,
          and it does not read anything else on your device.
        </p>
        <p>
          <B>On this website</B>, signing in sets a cookie that holds your session and another that
          remembers which church you are looking at. Both are strictly necessary for the site to work.
          Your choice of light or dark theme and similar display settings are kept in your browser. We
          use no advertising or analytics cookies, so there is nothing to opt out of.
        </p>
        <p>
          <B>Where it comes from.</B> Most of it from you, and the rest from your church: the person who
          invited you, and the leaders who keep the register, record gifts and follow up.
        </p>
      </Section>

      <Section id="sensitive" title="Sensitive information">
        <p>
          Church life involves information the law treats as especially sensitive: religious belief and
          practice, health (in prayer and care requests), marital status and information about children.
          We handle it only to provide Chapl to your church, we keep it behind the roles your church grants,
          and we never use it for advertising, profiling or anything unrelated to caring for the church. Give
          only what you are comfortable sharing: you decide what to write in a care request, and you can keep
          one private to the pastors.
        </p>
      </Section>

      <Section id="why" title="Why we use it, and on what basis">
        <Bullets>
          <li>
            <B>To provide Chapl</B> to you and your church: your account, your church&rsquo;s records,
            check-in, events, sermons, notices, care and the notifications that go with them. This is
            necessary to provide the service you and your church signed up for.
          </li>
          <li>
            <B>For your church&rsquo;s pastoral care and administration</B>, as a religious body caring
            for its own members. Your church relies on its legitimate interests and, for sensitive
            information such as religious belief and care notes, on its activities as a religious
            organisation with its members, or on your consent.
          </li>
          <li>
            <B>To keep Chapl and your account safe</B>: to stop password guessing, investigate misuse
            and keep an audit trail. This is in our legitimate interests and yours.
          </li>
          <li>
            <B>To talk to you about your account</B>: confirmation codes, password resets, invitations
            and notices of changes to Chapl or these documents. We do not send marketing.
          </li>
          <li>
            <B>To meet legal obligations</B>, and to establish or defend legal claims.
          </li>
        </Bullets>
        <p>
          Where we rely on your consent, you can withdraw it at any time by writing to <Contact />;
          that does not affect what was done before.
        </p>
      </Section>

      <Section id="cookies" title="Cookies and local storage">
        <dl className="border-b border-line">
          <Item what="Session cookie">
            Keeps you signed in on this website. Set when you sign in, removed when you sign out or after two
            days. Strictly necessary; httpOnly, so scripts on the page cannot read it.
          </Item>
          <Item what="Church choice">Remembers which church you are looking at. Strictly necessary.</Item>
          <Item what="Display settings">
            Your light or dark theme and the way you like the Sunday room drawn, kept in your browser&rsquo;s
            local storage. Never sent to us.
          </Item>
        </dl>
        <p>
          We set no advertising, analytics or tracking cookies. Because the only cookies are strictly
          necessary, there is no banner to accept. If your browser sends a &ldquo;Do Not Track&rdquo; or
          similar signal, nothing changes, because we do not track you.
        </p>
      </Section>

      <Section id="dont" title="What we don't do">
        <Bullets>
          <li>No advertising, and we never sell or rent your information.</li>
          <li>No tracking you across other apps or websites.</li>
          <li>No profiling or automated decisions that have legal or similar effects on you.</li>
          <li>
            No analytics or crash-reporting services. Apple and Google may share crash reports with us
            if you allow it in your phone&rsquo;s settings.
          </li>
        </Bullets>
      </Section>

      <Section id="who-sees" title="Who sees it">
        <Bullets>
          <li>
            <B>Your church&rsquo;s leaders</B>, as their role allows: your cell leader sees your cell, a
            branch pastor their branch, the church&rsquo;s administrators the church. Private care
            requests go only to pastors and administrators.
          </li>
          <li>
            <B>Members of your cell</B> see your name and photo, and your birthday (the day, not your
            age) on the church calendar.
          </li>
          <li>
            <B>Our team</B>, to run and support the service, and only as far as that needs.
          </li>
          <li>
            <B>Service providers</B> who run parts of it for us: Render (servers and database), Vercel
            (this website) and {LEGAL.emailProvider} (email delivery). They handle your information only
            on our instructions and to provide that service.
          </li>
          <li>
            <B>YouTube</B>, when you play a sermon your church published there. The video is loaded from
            YouTube (in its privacy-enhanced mode on this website) under Google&rsquo;s privacy policy.
          </li>
          <li>
            <B>Authorities</B>, where the law requires it, or where it is needed to protect someone from
            serious harm.
          </li>
          <li>
            <B>A successor</B>, if Chapl is merged, sold or transferred. The new operator would be bound
            by this policy, and we would tell you before your information came under a different policy.
          </li>
        </Bullets>
        <p>We share your information with nobody else.</p>
      </Section>

      <Section id="transfers" title="Where it is stored">
        <p>
          Our servers and database are in Frankfurt, Germany, with Render. This website is served by
          Vercel, and email is delivered through {LEGAL.emailProvider}, which may process it in the
          United States and elsewhere. So your information leaves Ghana. We use providers that protect
          it under contract and to recognised standards, and we transfer only what each needs.
        </p>
      </Section>

      <Section id="safe" title="Keeping it safe">
        <p>
          Everything travels encrypted over HTTPS. Passwords are stored as one-way hashes. A sign-in
          lasts at most two days, repeated wrong passwords lock the account for a while, and changing
          your password signs you out everywhere else. Access inside your church follows the roles your
          church grants. No system is perfectly secure; if a breach puts your information at risk, we
          will tell you and your church, and the regulator where the law requires, without undue delay.
        </p>
      </Section>

      <Section id="keep" title="How long we keep it">
        <Bullets>
          <li>Your account and profile: for as long as you have an account.</li>
          <li>
            Church records (attendance, giving, care and history): for as long as your church uses
            Chapl. When you leave, or delete your account, the church keeps them without your name.
          </li>
          <li>Sign-in attempts: until your account is deleted.</li>
          <li>Emails we send: the message is cleared once delivered.</li>
          <li>
            Backups of our database are kept for {LEGAL.backups} and then overwritten, so deleted
            information can survive in a backup for that long.
          </li>
          <li>
            If your church stops using Chapl, its records are deleted when it asks us to.
          </li>
        </Bullets>
      </Section>

      <Section id="delete" title="Deleting your account">
        <p>
          In the app, go to <B>Profile → Delete my account</B>, read what will happen, and confirm with
          your password.
        </p>
        <Bullets>
          <li>You are signed out on every device straight away, and we email you to confirm.</li>
          <li>
            <B>After 30 days</B> your account is permanently deleted: your sign-in, your profile and
            contact details, your photo, and your sign-in history.
          </li>
          <li>
            Changed your mind? Sign in again with the same email and password before the 30 days are up
            and the deletion is cancelled.
          </li>
          <li>Your church keeps its records, such as attendance and giving, without your name on them.</li>
        </Bullets>
        <p>
          If you cannot use the app, email <Contact /> from your account&rsquo;s address and we will do
          it for you.
        </p>
      </Section>

      <Section id="choices" title="Your choices">
        <Bullets>
          <li><B>What you share.</B> Most profile details are optional. Leave out what you would rather not give.</li>
          <li><B>Photo.</B> Add, change or remove it in Profile at any time.</li>
          <li><B>Reminders and notifications.</B> Switch Sunday reminders off in Profile, and manage notifications in your phone&rsquo;s settings.</li>
          <li><B>Care requests.</B> Choose whether a request goes to your cell leader and pastors, or to pastors only.</li>
          <li><B>Anonymous giving.</B> Ask your church to keep a gift off reports that show names.</li>
          <li><B>Email.</B> We send only what your account needs. There is nothing to unsubscribe from.</li>
        </Bullets>
      </Section>

      <Section id="rights" title="Your rights">
        <p>Under {LEGAL.dataLaw}, and similar laws where you live, you can:</p>
        <Bullets>
          <li>see what we hold about you, and have a copy of it;</li>
          <li>have it corrected (most of it you can correct yourself in <B>Profile</B>);</li>
          <li>have it deleted, as above;</li>
          <li>object to how it is used, or have its use restricted;</li>
          <li>have it given to you, or to someone else, in a usable format;</li>
          <li>withdraw consent you have given.</li>
        </Bullets>
        <p>
          Write to <Contact /> from your account&rsquo;s address. We may ask you to confirm who you are,
          and we answer within one month. There is no charge. If you think we have got something wrong,
          tell us first; you can also complain to {LEGAL.regulator}, or to the data protection authority
          where you live.
        </p>
      </Section>

      <Section id="regions" title="If you live outside Ghana">
        <p>
          <B>European Economic Area, United Kingdom and Switzerland.</B> You have the rights above under the
          GDPR and UK GDPR, you may complain to your local supervisory authority, and where we send your
          information outside those regions we rely on contractual safeguards such as standard contractual
          clauses.
        </p>
        <p>
          <B>California and other US states.</B> You can ask to know what personal information we collect,
          use and disclose, to correct or delete it, and not to be discriminated against for doing so. We do
          not sell or share personal information for advertising, as those words are defined by those laws,
          and we do not knowingly collect information from anyone under 16 without a parent&rsquo;s or
          guardian&rsquo;s involvement. You may use an authorised agent to make a request.
        </p>
        <p>
          <B>Anywhere else.</B> You have the rights your local law gives you; write to us and we will honour
          them as far as the law requires.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          Chapl is not meant for children under {LEGAL.minimumAge} without a parent&rsquo;s or
          guardian&rsquo;s involvement. A church that records a younger member does so with their
          parent&rsquo;s or guardian&rsquo;s permission and is responsible for it. If you believe a
          child has an account they should not have, contact us and we will remove it.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          We will post any change here and update the date at the top. If a change materially affects
          how your information is used, we will also tell you in the app or by email before it takes
          effect.
        </p>
      </Section>

      <Section id="links" title="Other sites and services">
        <p>
          Chapl links to and embeds services we do not run, such as YouTube, maps, WhatsApp and your
          phone&rsquo;s dialler. Following a link leaves Chapl, and the other service&rsquo;s privacy policy
          applies from there. We do not control them and are not responsible for what they do.
        </p>
      </Section>

      <Section id="complaints" title="Questions and complaints">
        <p>
          We take privacy seriously and keep one address for it: write to <Contact /> with &ldquo;Privacy&rdquo;
          in the subject. We acknowledge within a few days, reply in full within one month, and tell you if
          we need longer and why. If you are not satisfied, you may complain to {LEGAL.regulator}, or to your
          local data protection authority.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          {LEGAL.operator}, {LEGAL.address}. Email <Contact />. See also our{" "}
          <Link href="/terms" className="font-medium text-ink hover:underline">
            terms of service
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
