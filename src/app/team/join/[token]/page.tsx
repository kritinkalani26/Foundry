"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

export default function JoinTeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<"loading" | "joining" | "success" | "error">("loading");
  const [teamName, setTeamName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      // Redirect to sign-in and come back after
      router.push(`/auth/login?callbackUrl=/team/join/${token}`);
      return;
    }
    if (status !== "authenticated") return;

    setState("joining");
    fetch("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then((data: { teamName?: string; error?: string }) => {
        if (data.error) {
          setErrorMsg(data.error);
          setState("error");
        } else {
          setTeamName(data.teamName ?? "your team");
          setState("success");
          setTimeout(() => router.push("/team"), 2500);
        }
      })
      .catch(() => {
        setErrorMsg("Something went wrong. Please try again.");
        setState("error");
      });
  }, [status, token, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        {(state === "loading" || state === "joining") && (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Joining team…</h2>
            <p className="text-sm text-gray-500 mt-1">Verifying your invite link.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">You&apos;re in!</h2>
            <p className="text-gray-500 text-sm mt-2">
              You&apos;ve joined <span className="font-semibold text-gray-900">{teamName}</span>. Redirecting to your teamspace…
            </p>
            <div className="mt-4 h-1 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-1 bg-blue-600 rounded-full animate-[grow_2.5s_linear_forwards]" style={{ width: "100%", transformOrigin: "left" }} />
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900">Couldn&apos;t join</h2>
            <p className="text-gray-500 text-sm mt-2">{errorMsg}</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button
                onClick={() => router.push("/team")}
                className="rounded-xl bg-blue-600 text-white font-semibold py-2.5 px-5 hover:bg-blue-700 transition-colors text-sm"
              >
                Go to Team
              </button>
              <button
                onClick={() => router.push("/")}
                className="rounded-xl border border-gray-200 text-gray-600 font-semibold py-2.5 px-5 hover:bg-gray-50 transition-colors text-sm"
              >
                Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
