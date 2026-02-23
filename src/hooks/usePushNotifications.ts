import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      // ignore
    }
  }

  async function subscribe() {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      // Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } =
        await supabase.functions.invoke("push-notifications", {
          body: { action: "get-vapid-key" },
        });

      if (vapidError || !vapidData?.publicKey) {
        console.error("Failed to get VAPID key:", vapidError);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey) as BufferSource,
      });

      // Send subscription to server
      const { error: subError } = await supabase.functions.invoke(
        "push-notifications",
        {
          body: {
            action: "subscribe",
            subscription: subscription.toJSON(),
          },
        }
      );

      if (subError) {
        console.error("Failed to save subscription:", subError);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription error:", err);
      return false;
    }
  }

  return { isSubscribed, isSupported, subscribe };
}

export async function sendMenuNotification() {
  const { error } = await supabase.functions.invoke("push-notifications", {
    body: {
      action: "notify",
      title: "lunchppy 🍽️",
      body: "¡El menú del día ya está disponible! Haz tu pedido ahora.",
    },
  });
  return !error;
}
