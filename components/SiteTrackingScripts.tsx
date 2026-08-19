"use client";

import { useEffect } from "react";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import type { PublicSiteTrackingFields } from "@/lib/queries/public-site-tracking";

function injectHtmlSnippet(html: string, target: "head" | "body") {
  if (!html.trim() || typeof document === "undefined") return () => {};

  const parent = target === "head" ? document.head : document.body;
  const template = document.createElement("template");
  template.innerHTML = html;
  const nodes = Array.from(template.content.childNodes);
  parent.appendChild(template.content);

  return () => {
    for (const node of nodes) {
      node.parentNode?.removeChild(node);
    }
  };
}

function appendInlineScript(id: string, code: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.text = code;
  document.head.appendChild(script);
}

function appendExternalScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadTracking(tracking: PublicSiteTrackingFields) {
  const gaId = tracking.googleAnalyticsId.trim();
  const gtmId = tracking.googleTagManagerId.trim();
  const adsId = tracking.googleAdsId.trim();
  const clarityId = tracking.microsoftClarityId.trim();
  const pixelId = tracking.facebookPixelId.trim();

  if (gtmId) {
    appendInlineScript(
      "gtm-loader",
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`
    );
  } else if (gaId || adsId) {
    appendExternalScript(
      "gtag-src",
      `https://www.googletagmanager.com/gtag/js?id=${gaId || adsId}`
    );
    appendInlineScript(
      "gtag-init",
      `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${gaId ? `gtag('config', '${gaId}');` : ""}
${adsId ? `gtag('config', '${adsId}');` : ""}`
    );
  }

  if (clarityId) {
    appendInlineScript(
      "ms-clarity",
      `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${clarityId}");`
    );
  }

  if (pixelId) {
    appendInlineScript(
      "fb-pixel",
      `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`
    );
  }
}

type SiteTrackingScriptsProps = {
  tracking: PublicSiteTrackingFields;
};

export default function SiteTrackingScripts({
  tracking,
}: SiteTrackingScriptsProps) {
  const ready = useDeferredMount(8000);
  const gtmId = tracking.googleTagManagerId.trim();
  const headScripts = tracking.headScripts.trim();
  const bodyScripts = tracking.bodyScripts.trim();

  useEffect(() => {
    if (!ready) return;
    loadTracking(tracking);
    const cleanupHead = injectHtmlSnippet(headScripts, "head");
    const cleanupBody = injectHtmlSnippet(bodyScripts, "body");
    return () => {
      cleanupHead();
      cleanupBody();
    };
  }, [ready, tracking, headScripts, bodyScripts]);

  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
