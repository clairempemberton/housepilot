"use client";

import { useState, useEffect } from "react";
import useAuth from "@/utils/useAuth";
import { Home } from "lucide-react";

function SignInPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        const errorMessages = {
          CredentialsSignin: "Incorrect email or password. Please try again.",
          OAuthSignin: "Couldn't start sign-in. Please try again.",
          OAuthCallback: "Sign-in failed. Please try again.",
          AccessDenied: "You don't have permission to sign in.",
          Configuration:
            "Sign-in isn't working right now. Please try again later.",
          Verification: "Your sign-in link has expired. Request a new one.",
        };
        setError(
          errorMessages[urlError] ||
            "Incorrect email or password. Please try again.",
        );
        setLoading(false);
      }
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signInWithCredentials({
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: true,
      });
    } catch (err) {
      const errorMessages = {
        CredentialsSignin: "Incorrect email or password. Please try again.",
        OAuthSignin: "Couldn't start sign-in. Please try again.",
        OAuthCallback: "Sign-in failed. Please try again.",
        AccessDenied: "You don't have permission to sign in.",
        Configuration:
          "Sign-in isn't working right now. Please try again later.",
      };
      const msg = err?.message || err?.code || "";
      setError(
        errorMessages[msg] || "Incorrect email or password. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <form
        noValidate
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-6"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#6666f7] rounded-2xl flex items-center justify-center mb-4">
            <Home size={22} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">
            HousePilot
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Welcome back
        </h1>
        <p className="text-sm text-gray-400 text-center">
          Sign in to manage your household
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6666f7] focus:border-transparent text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#6666f7] text-white rounded-xl font-medium hover:bg-[#4d4dc7] transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <a
            href="/account/signup"
            className="text-[#6666f7] font-medium hover:underline"
          >
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}

export default SignInPage;
