"use client";

import useAuth from "@/utils/useAuth";
import { Home, LogOut } from "lucide-react";

function LogoutPage() {
  const { signOut } = useAuth();
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true,
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#6666f7] rounded-2xl flex items-center justify-center mb-4">
            <Home size={22} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">
            HousePilot
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">Sign Out</h1>
        <p className="text-sm text-gray-400">
          Are you sure you want to sign out?
        </p>

        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-[#6666f7] text-white rounded-xl font-medium hover:bg-[#4d4dc7] transition-all active:scale-[0.98] text-sm flex items-center justify-center space-x-2"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>

        <a
          href="/dashboard"
          className="block text-sm text-gray-400 hover:text-[#6666f7] transition-colors"
        >
          Go back to dashboard
        </a>
      </div>
    </div>
  );
}

export default LogoutPage;
