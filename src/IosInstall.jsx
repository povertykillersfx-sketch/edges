import { useEffect, useState } from "react";
import { bindIosInstall, dismissIosBanner, iosBannerDismissed, isIos, isStandalone } from "./pwa.js";
import "./landing.css";

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

export function IosInstall() {
  const [open, setOpen] = useState(() => isIos() && !isStandalone() && !iosBannerDismissed());

  useEffect(() => {
    return bindIosInstall(() => setOpen(true));
  }, []);

  if (!open || !isIos() || isStandalone()) return null;

  return (
    <aside className="ios-install" role="dialog" aria-labelledby="ios-install-title">
      <div className="ios-install-card">
        <div className="ios-install-head">
          <img src="/icons/icon-192.png" alt="" />
          <div>
            <p>Client app</p>
            <h2 id="ios-install-title">Add EA Host Hub to your home screen</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              dismissIosBanner();
              setOpen(false);
            }}
          >
            ×
          </button>
        </div>
        <ol>
          <li>
            <span>1</span>
            <p>
              Tap the <ShareIcon /> <strong>Share</strong> icon in Safari.
            </p>
          </li>
          <li>
            <span>2</span>
            <p>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
          </li>
        </ol>
      </div>
    </aside>
  );
}
