import type { Metadata } from "next";
import Link from "next/link";

import { B, Bullets, Contact, LEGAL, LegalPage, Loud, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Licence agreement — Chapl",
  description: "The end user licence agreement for the Chapl apps on iPhone and Android.",
  alternates: { canonical: "/eula" },
};

const link = "font-medium text-ink hover:underline";

/**
 * The end user licence agreement for the phone apps. It carries the terms
 * Apple requires of a custom EULA (acknowledgement, scope, support,
 * warranty, product claims, IP claims, export, contact, third-party terms
 * and Apple as third-party beneficiary), and the same for Google Play.
 * Using the service itself is the terms of service.
 */
export default function EulaPage() {
  return (
    <LegalPage eyebrow="Licence" title="End user licence agreement" path="/eula">
      <p>
        This agreement is between you and {LEGAL.operator}, {LEGAL.address} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;), and covers the Chapl app for iPhone, iPad and Android (&ldquo;the App&rdquo;).
        By downloading, installing or using the App you agree to it. Your use of the Chapl service through
        the App is also governed by our <Link href="/terms" className={link}>terms of service</Link> and{" "}
        <Link href="/privacy" className={link}>privacy policy</Link>.
      </p>

      <Section id="acknowledgement" title="1. Acknowledgement">
        <p>
          This agreement is between you and us only, <B>not with Apple Inc. or Google LLC</B> (each a
          &ldquo;Store&rdquo;). We, not the Store, are solely responsible for the App and its content. If
          this agreement conflicts with the Store&rsquo;s own terms of use for apps, including Apple&rsquo;s
          Usage Rules in the App Store Terms of Service, the Store&rsquo;s terms win to the extent of the
          conflict.
        </p>
      </Section>

      <Section id="licence" title="2. Your licence">
        <p>
          We give you a limited, non-exclusive, non-transferable, revocable licence to install and use the
          App on devices you own or control, for your own use with your church, as the Store&rsquo;s usage
          rules permit (on Apple devices, including through Family Sharing where it applies). The App is
          licensed, not sold.
        </p>
        <p>You must not:</p>
        <Bullets>
          <li>copy, modify or make derivative works of the App;</li>
          <li>
            reverse engineer, decompile or disassemble it, or try to extract its source code, except where
            the law allows it despite this restriction;
          </li>
          <li>rent, lease, lend, sell, sublicense or distribute it;</li>
          <li>remove or change any notice of ownership in it;</li>
          <li>use it to break the law or our terms of service, or to build a competing product.</li>
        </Bullets>
      </Section>

      <Section id="support" title="3. Maintenance and support">
        <p>
          We alone are responsible for maintaining and supporting the App, as described here or as the law
          requires. Write to <Contact />. The Stores have no obligation at all to provide maintenance or
          support for the App.
        </p>
      </Section>

      <Section id="updates" title="4. Updates">
        <p>
          We may release updates that fix, change or remove features. Some may be needed to keep using the
          App. This agreement covers each update unless it comes with its own terms.
        </p>
      </Section>

      <Section id="warranty" title="5. Warranty">
        <p>
          The App is provided free of charge. If it fails to conform to any warranty the law gives you, you
          may tell the Store, and Apple will refund the purchase price, if any, you paid for the App. To the
          fullest extent the law allows, the Stores have no other warranty obligation with respect to the
          App, and any other claims, losses, liabilities, damages, costs or expenses from a failure to
          conform to a warranty are our sole responsibility, as far as they are not disclaimed below.
        </p>
        <Loud>
          Apart from that, and to the fullest extent the law allows, the App is provided &ldquo;as is&rdquo;
          and &ldquo;as available&rdquo;, with all faults and without warranty of any kind, and we disclaim
          all warranties and conditions, express or implied, including of merchantability, satisfactory
          quality, fitness for a particular purpose, accuracy, quiet enjoyment and non-infringement.
        </Loud>
      </Section>

      <Section id="liability" title="6. Limitation of liability">
        <Loud>
          To the fullest extent the law allows, we will not be liable for any indirect, incidental, special,
          consequential or punitive damages, or for loss of data, profits or goodwill, arising from your use
          of or inability to use the App. Our total liability under this agreement is limited to the greater
          of the amount you paid for the App and GHS 500.
        </Loud>
        <p>Nothing here limits liability that the law does not allow to be limited.</p>
      </Section>

      <Section id="claims" title="7. Product claims">
        <p>
          We, not the Stores, are responsible for addressing any claim by you or anyone else relating to the
          App or your possession or use of it, including product liability claims, claims that the App fails
          to meet a legal or regulatory requirement, and claims under consumer protection, privacy or similar
          laws, including in connection with the App&rsquo;s use of HealthKit, HomeKit or similar
          frameworks (the App uses none today).
        </p>
      </Section>

      <Section id="ip" title="8. Intellectual property">
        <p>
          The App and everything in it, apart from content you or your church add, belong to us and our
          licensors. If anyone claims that the App or your possession and use of it infringes their
          intellectual property rights, we, not the Stores, are solely responsible for investigating,
          defending, settling and discharging that claim.
        </p>
      </Section>

      <Section id="export" title="9. Legal compliance">
        <p>
          You confirm that you are not located in a country that is subject to a U.S. Government embargo or
          that the U.S. Government has designated as a &ldquo;terrorist supporting&rdquo; country, and that
          you are not on any U.S. Government list of prohibited or restricted parties. You will comply with
          all export and sanctions laws that apply to the App.
        </p>
      </Section>

      <Section id="third-party" title="10. Third-party terms">
        <p>
          You must comply with the terms of any third-party service you use with the App, such as your
          mobile network or wireless data agreement.
        </p>
      </Section>

      <Section id="ending" title="11. Ending">
        <p>
          This licence lasts until you or we end it. You can end it by deleting the App. It ends
          automatically if you break this agreement, and we may end it if we stop offering the App. When it
          ends, stop using the App and delete it. Sections 5 to 8 and 12 to 14 survive.
        </p>
      </Section>

      <Section id="law" title="12. Law">
        <p>
          This agreement is governed by {LEGAL.law}, and disputes go to {LEGAL.courts}, unless the law where
          you live gives you the right to bring them there.
        </p>
      </Section>

      <Section id="beneficiary" title="13. Third-party beneficiary">
        <p>
          Apple Inc. and its subsidiaries, and Google LLC and its affiliates, are third-party beneficiaries
          of this agreement. Once you accept it, Apple will have the right (and will be deemed to have
          accepted the right) to enforce it against you as a third-party beneficiary, for the App obtained
          through the App Store.
        </p>
      </Section>

      <Section id="contact" title="14. Contact and general">
        <p>
          Questions, complaints or claims about the App go to {LEGAL.operator}, {LEGAL.address}, <Contact />.
          If any part of this agreement is unenforceable, the rest stays in force. We may update it, and will
          post the new version here with its date.
        </p>
      </Section>
    </LegalPage>
  );
}
