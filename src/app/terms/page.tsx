import type { Metadata } from "next";
import Link from "next/link";

import { B, Bullets, Contact, LEGAL, LegalPage, Loud, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of service — Chapl",
  description: "The agreement between you and Chapl for using the Chapl apps and website.",
  alternates: { canonical: "/terms" },
};

const link = "font-medium text-ink hover:underline";

/**
 * The terms of service: the agreement for using Chapl at all, for a
 * member and for a church. The licence for the phone app itself is the
 * EULA (`/eula`); how information is handled is the privacy policy.
 */
export default function TermsPage() {
  return (
    <LegalPage eyebrow="Terms" title="Terms of service" path="/terms">
      <p>
        These terms are an agreement between you and {LEGAL.operator}, {LEGAL.address}
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;), for using the Chapl apps and website (&ldquo;Chapl&rdquo;).
        By creating an account, accepting an invitation, or using Chapl, you agree to them, to our{" "}
        <Link href="/privacy" className={link}>privacy policy</Link>, and, for the phone apps, to the{" "}
        <Link href="/eula" className={link}>licence agreement</Link>. If you do not agree, do not use
        Chapl.
      </p>

      <Section id="definitions" title="1. Words used here">
        <Bullets>
          <li>
            A <B>church</B> is an organisation that uses Chapl for its people, with its branches and cells.
          </li>
          <li>
            An <B>administrator</B> is someone a church gives authority in Chapl: an owner, pastor,
            administrator or leader.
          </li>
          <li>
            A <B>member</B> is anyone with an account in a church.
          </li>
          <li>
            <B>Content</B> is anything put into Chapl: records, notes, messages, photos, sermons, events
            and notices.
          </li>
        </Bullets>
      </Section>

      <Section id="eligibility" title="2. Who may use Chapl">
        <p>
          You must be at least {LEGAL.minimumAge}, or use Chapl with the permission and involvement of a
          parent or guardian. If you register a church or act for one, you confirm you are authorised to
          do so and to bind it to these terms.
        </p>
      </Section>

      <Section id="accounts" title="3. Your account">
        <Bullets>
          <li>Give accurate information and keep it up to date.</li>
          <li>
            Keep your password secret. You are responsible for what happens under your account until you
            tell us it has been compromised.
          </li>
          <li>One account per person. Do not share it, sell it or let anyone else use it.</li>
          <li>
            Tell us at <Contact /> straight away if you think someone else has used your account.
          </li>
        </Bullets>
      </Section>

      <Section id="churches" title="4. Churches and administrators">
        <p>A church, and each administrator acting for it, agrees to:</p>
        <Bullets>
          <li>
            have the right to record what it puts into Chapl about its people, including any notice or
            consent the law requires, and the permission of a parent or guardian for anyone under{" "}
            {LEGAL.minimumAge};
          </li>
          <li>
            use members&rsquo; information only for the church&rsquo;s own pastoral care and
            administration, and keep it confidential;
          </li>
          <li>
            give roles only to people it trusts with what those roles can see, and remove them when they
            no longer need it;
          </li>
          <li>answer requests from its members about the information it keeps about them.</li>
        </Bullets>
        <p>
          We review churches before they open, and may decline, suspend or close a church that breaks
          these terms or does not appear to be genuine.
        </p>
      </Section>

      <Section id="use" title="5. Acceptable use">
        <p>You must not use Chapl to:</p>
        <Bullets>
          <li>break any law, or help anyone else to;</li>
          <li>harass, threaten, defame or harm anyone, or share content that is hateful or obscene;</li>
          <li>record or share anyone&rsquo;s information without the right to;</li>
          <li>send spam, or contact people for purposes unrelated to the church;</li>
          <li>impersonate anyone, or misrepresent your connection to a church;</li>
          <li>
            get into accounts, churches or data you are not authorised for, or test, probe or get around
            our security;
          </li>
          <li>
            upload malware, overload or disrupt the service, or scrape or harvest data from it by
            automated means;
          </li>
          <li>copy, resell or build a competing product from Chapl.</li>
        </Bullets>
      </Section>

      <Section id="content" title="6. Content">
        <p>
          You, or your church, keep ownership of the content you put into Chapl. You give us a
          non-exclusive, worldwide, royalty-free licence to store, copy, process and display it only to
          provide and secure Chapl for you and your church, for as long as it is in Chapl and the backup
          period after. You confirm you have the right to give that licence.
        </p>
        <p>
          You are responsible for your content. We do not review it before it appears, but we may remove
          content or restrict an account that breaks these terms or the law, or that we are told to remove
          by a lawful authority.
        </p>
        <p>
          If you send us ideas or feedback, we may use them without any obligation to you.
        </p>
      </Section>

      <Section id="giving" title="7. Giving">
        <p>
          Chapl records gifts a church receives; it does not take, hold or move money. Any gift is between
          you and your church. We are not responsible for gifts, receipts, refunds or tax treatment.
        </p>
      </Section>

      <Section id="ours" title="8. What belongs to us">
        <p>
          Chapl itself — its software, design, name and logo — belongs to us and our licensors. These terms
          give you a right to use it, not any ownership of it. The phone apps are licensed under the{" "}
          <Link href="/eula" className={link}>licence agreement</Link>.
        </p>
      </Section>

      <Section id="third-party" title="9. Other services">
        <p>
          Chapl links to and embeds other services, such as YouTube for sermon videos, maps for
          directions, and WhatsApp and your phone for calls and messages. They have their own terms, and
          we are not responsible for them.
        </p>
      </Section>

      <Section id="service" title="10. The service">
        <p>
          Chapl is offered free of charge at present. We may change, add or remove features, and we will
          give reasonable notice of changes that take away something you rely on. We aim to keep Chapl
          available but do not promise it will be uninterrupted, and we may suspend it for maintenance,
          security or reasons outside our control. If we introduce charges, we will tell you first, and
          nothing will be charged without your agreement.
        </p>
      </Section>

      <Section id="ending" title="11. Ending">
        <p>
          You can stop using Chapl at any time, and delete your account from the app as the{" "}
          <Link href="/privacy#delete" className={link}>privacy policy</Link> describes. A church can ask us
          to close it.
        </p>
        <p>
          We may suspend or close an account or church that breaks these terms, puts others at risk, or
          where the law requires it, with notice where it is reasonable to give it. Sections 6 to 8 and 12
          to 16 survive the end of these terms.
        </p>
      </Section>

      <Section id="disclaimer" title="12. Disclaimer">
        <Loud>
          Chapl is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent the
          law allows, we give no warranties, express or implied, including of merchantability, fitness for
          a particular purpose, accuracy and non-infringement, and we do not warrant that Chapl will be
          error-free, secure or uninterrupted, or that content in it is accurate. Chapl is a tool for
          church administration; it is not a substitute for professional, medical, legal or emergency
          help. In an emergency, contact the emergency services.
        </Loud>
      </Section>

      <Section id="liability" title="13. Limitation of liability">
        <Loud>
          To the fullest extent the law allows, we will not be liable for any indirect, incidental,
          special, consequential or punitive loss, or for loss of data, profits, goodwill or reputation,
          arising from or related to Chapl, however caused, even if we were told it was possible. Our
          total liability for all claims arising from or related to Chapl or these terms is limited to
          the greater of the amount you paid us for Chapl in the twelve months before the claim and GHS
          500.
        </Loud>
        <p>
          Nothing in these terms limits liability that cannot be limited by law, such as for death or
          personal injury caused by negligence, or for fraud, or takes away rights you have as a consumer
          that cannot be waived.
        </p>
      </Section>

      <Section id="indemnity" title="14. Indemnity">
        <p>
          You will compensate us for claims, losses and reasonable costs (including legal fees) that arise
          from your content, your breach of these terms, or your misuse of Chapl. If you act for a church,
          the church does too, for what it puts into Chapl and how its administrators use it.
        </p>
      </Section>

      <Section id="law" title="15. Law and disputes">
        <p>
          These terms are governed by {LEGAL.law}. Before starting a formal dispute, write to us at{" "}
          <Contact /> and give us 30 days to try to resolve it. Any dispute that is not resolved goes
          to {LEGAL.courts}, which have exclusive jurisdiction, unless the law where you live gives you
          the right to bring it there.
        </p>
      </Section>

      <Section id="general" title="16. General">
        <Bullets>
          <li>
            <B>Changes.</B> We may update these terms. We will post the new version here with its date, and
            tell you in the app or by email before a material change takes effect. Using Chapl after that
            means you accept it.
          </li>
          <li>
            <B>Whole agreement.</B> These terms, the privacy policy and the licence agreement are the whole
            agreement between you and us about Chapl.
          </li>
          <li>
            <B>Severability.</B> If any part is found unenforceable, the rest stays in force.
          </li>
          <li>
            <B>No waiver.</B> Not enforcing a part of these terms is not giving up the right to.
          </li>
          <li>
            <B>Assignment.</B> You may not transfer these terms. We may, to a successor running Chapl.
          </li>
          <li>
            <B>Events outside our control.</B> We are not liable for failing to perform because of events
            beyond our reasonable control.
          </li>
          <li>
            <B>Notices.</B> We send notices to the email on your account; you send them to <Contact />.
          </li>
        </Bullets>
      </Section>
    </LegalPage>
  );
}
