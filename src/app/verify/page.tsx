import { AuthShell } from "@/components/auth-shell";
import { VerifyForm } from "@/app/verify/form";
import { resendOtp, verifyOtp } from "@/app/actions/auth";

export const metadata = { title: "Confirm your email — Chapl" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const purpose = params.purpose ?? "activation";

  return (
    <AuthShell
      eyebrow="One more step"
      title="Confirm your email"
      lede={
        email ? (
          <>
            Enter the six-digit code sent to <span className="text-ink">{email}</span>.
          </>
        ) : (
          "Enter the six-digit code we sent you."
        )
      }
    >
      <VerifyForm
        verifyAction={verifyOtp}
        resendAction={resendOtp}
        email={email}
        purpose={purpose}
        next={params.next ?? ""}
      />
    </AuthShell>
  );
}
