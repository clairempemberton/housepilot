import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useAuthModal, useAuthStore } from "./store";

const callbackUrl = "/api/auth/token";
const callbackQueryString = `callbackUrl=${callbackUrl}`;

export const AuthWebView = ({ mode, proxyURL, baseURL }) => {
  const [currentURI, setURI] = useState(
    `${baseURL}/account/${mode}?${callbackQueryString}`
  );

  const { auth, setAuth, isReady } = useAuthStore();
  const { close } = useAuthModal();

  const isAuthenticated = isReady ? !!auth : null;
  const iframeRef = useRef(null);

  const routeAfterAuth = async () => {
    try {
      const res = await fetch(`${baseURL}/api/subscription`, {
        credentials: "include",
      });

      if (!res.ok) {
        router.replace("/paywall");
        close();
        return;
      }

      const data = await res.json();

      if (data?.hasAccess) {
        router.replace("/(tabs)");
      } else {
        router.replace("/paywall");
      }

      close();
    } catch (error) {
      console.error("Post-auth subscription routing error:", error);
      router.replace("/paywall");
      close();
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!isAuthenticated) return;

    routeAfterAuth();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    setURI(`${baseURL}/account/${mode}?${callbackQueryString}`);
  }, [mode, baseURL, isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.addEventListener) return;

    const handleMessage = async (event) => {
      if (event.origin !== process.env.EXPO_PUBLIC_PROXY_BASE_URL) return;

      if (event.data?.type === "AUTH_SUCCESS") {
        setAuth({
          jwt: event.data.jwt,
          user: event.data.user,
        });

        try {
          const res = await fetch(`${baseURL}/api/subscription`, {
            credentials: "include",
          });

          if (!res.ok) {
            router.replace("/paywall");
            close();
            return;
          }

          const data = await res.json();

          if (data?.hasAccess) {
            router.replace("/(tabs)");
          } else {
            router.replace("/paywall");
          }

          close();
        } catch (error) {
          console.error("Web auth routing error:", error);
          router.replace("/paywall");
          close();
        }
      } else if (event.data?.type === "AUTH_ERROR") {
        console.error("Auth error:", event.data.error);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [baseURL, close, setAuth]);

  if (Platform.OS === "web") {
    const handleIframeError = () => {
      console.error("Failed to load auth iframe");
    };

    return (
      <iframe
        ref={iframeRef}
        src={currentURI}
        onError={handleIframeError}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: "white",
        }}
        title={`${mode}-auth`}
      />
    );
  }

  return (
    <WebView
      source={{ uri: currentURI }}
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === `${baseURL}${callbackUrl}`) {
          fetch(request.url, {
            credentials: "include",
          })
            .then(async (response) => {
              if (!response.ok) {
                throw new Error("Failed to exchange auth token");
              }

              const data = await response.json();

              setAuth({
                jwt: data.jwt,
                user: data.user,
              });
            })
            .catch((error) => {
              console.error("Native auth callback error:", error);
            });

          return false;
        }

        if (request.url === currentURI) return true;

        const hasParams = request.url.includes("?");
        const separator = hasParams ? "&" : "?";
        const newURL = request.url.replaceAll(proxyURL, baseURL);

        if (newURL.endsWith(callbackUrl)) {
          setURI(newURL);
          return false;
        }

        setURI(`${newURL}${separator}${callbackQueryString}`);
        return false;
      }}
      style={{ flex: 1 }}
    />
  );
};