// Background service worker for Savest

// Import API client (available as self.supabase)
importScripts("lib/supabase.js");

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  confirmBeforePurchase: false,
  returnRate: 7,
  years: 10,
  minPrice: 10,
};

// Restore auth session on startup
supabase.restoreSession().then((user) => {
  console.log("[Savest BG] Session restored:", !!user);
});

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default settings on fresh install
    chrome.storage.local.set(DEFAULT_SETTINGS);
    console.log("Savest installed");
  } else if (details.reason === "update") {
    // Ensure new settings exist after update
    chrome.storage.local.get(DEFAULT_SETTINGS, (current) => {
      // Only set defaults for missing keys
      const updates = {};
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (current[key] === undefined) {
          updates[key] = DEFAULT_SETTINGS[key];
        }
      }
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates);
      }
    });
    console.log("Savest updated");
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "authStateChanged") {
    // Broadcast auth state change to all extension pages
    broadcastAuthState(message.user);
    sendResponse({ success: true });
  }

  if (message.action === "getAuthState") {
    // Get current auth state from storage
    chrome.storage.local.get(["api_user"], (result) => {
      sendResponse({ user: result.api_user || null });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === "syncAuthFromFrontend") {
    // Received auth tokens from frontend via content script
    const { accessToken, refreshToken, user } = message;

    if (accessToken && refreshToken) {
      chrome.storage.local.set(
        {
          api_access_token: accessToken,
          api_refresh_token: refreshToken,
          api_user: user,
        },
        () => {
          console.log("Auth synced from frontend");
          // Update the supabase client in background
          supabase.accessToken = accessToken;
          supabase.refreshToken = refreshToken;
          supabase.user = user;
          // Broadcast to all extension pages
          broadcastAuthState(user);
        },
      );
    }
    sendResponse({ success: true });
  }

  // Content script API proxying (content scripts can't fetch cross-origin)
  if (message.action === "recordSaving") {
    (async () => {
      try {
        if (!supabase.isAuthenticated()) {
          await supabase.restoreSession();
        }
        const result = await supabase.recordSaving(message.data);
        sendResponse({ success: true, saving: result });
      } catch (e) {
        console.error("[Savest BG] Failed to record saving:", e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (message.action === "getVariants") {
    (async () => {
      try {
        const variants = await supabase.getActiveVariants();
        sendResponse({ success: true, variants });
      } catch (e) {
        console.error("[Savest BG] Failed to get variants:", e);
        sendResponse({ success: false, variants: [] });
      }
    })();
    return true;
  }

  if (message.action === "getWeightedVariant") {
    (async () => {
      try {
        if (!supabase.isAuthenticated()) {
          await supabase.restoreSession();
        }
        const variant = await supabase.selectWeightedVariant();
        sendResponse({ success: true, variant });
      } catch (e) {
        console.error("[Savest BG] Failed to get weighted variant:", e);
        sendResponse({ success: false, variant: null });
      }
    })();
    return true;
  }

  return false;
});

// Broadcast auth state to all tabs with content scripts
async function broadcastAuthState(user) {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        "*://*.amazon.com/*",
        "*://*.amazon.co.uk/*",
        "*://*.amazon.ca/*",
        "*://*.amazon.de/*",
        "*://*.amazon.fr/*",
        "*://*.amazon.es/*",
        "*://*.amazon.it/*",
        "*://*.amazon.co.jp/*",
        "*://*.amazon.com.au/*",
      ],
    });

    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: "authStateChanged",
          user: user,
        });
      } catch (e) {
        // Tab might not have content script loaded
      }
    }
  } catch (e) {
    console.log("Failed to broadcast auth state:", e);
  }
}

// Periodic session refresh (every 30 minutes)
chrome.alarms.create("sessionRefresh", {
  periodInMinutes: 30,
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sessionRefresh") {
    supabase.restoreSession().then((user) => {
      console.log("[Savest BG] Periodic session refresh:", !!user);
    });
  }
});

// Handle extension icon click when popup is not defined
chrome.action.onClicked.addListener((tab) => {
  // This won't fire when default_popup is set, but good to have as fallback
  chrome.action.openPopup();
});
